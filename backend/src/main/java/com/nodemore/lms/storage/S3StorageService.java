package com.nodemore.lms.storage;

import com.nodemore.lms.config.AppProperties;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ContentDisposition;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

/** Cloudflare R2 (or any S3 compatible) storage with presigned, time-limited URLs. */
@Slf4j
@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "s3")
public class S3StorageService implements StorageService {

    private final S3Client client;
    private final S3Presigner presigner;
    private final String bucket;

    public S3StorageService(AppProperties props) {
        var s = props.getStorage();
        var creds = StaticCredentialsProvider.create(AwsBasicCredentials.create(s.getS3AccessKey(), s.getS3SecretKey()));
        var cfg = S3Configuration.builder().pathStyleAccessEnabled(true).build();
        URI endpoint = URI.create(s.getS3Endpoint());
        this.bucket = s.getS3Bucket();
        this.client = S3Client.builder().endpointOverride(endpoint).region(Region.of(s.getS3Region()))
                .credentialsProvider(creds).serviceConfiguration(cfg).build();
        this.presigner = S3Presigner.builder().endpointOverride(endpoint).region(Region.of(s.getS3Region()))
                .credentialsProvider(creds).serviceConfiguration(cfg).build();
        log.info("S3/R2 storage bucket {}", bucket);
    }

    @Override
    public UploadTicket presignUpload(String key, String contentType, long maxBytes) {
        var put = PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build();
        var req = PutObjectPresignRequest.builder().signatureDuration(Duration.ofMinutes(60)).putObjectRequest(put).build();
        String url = presigner.presignPutObject(req).url().toString();
        return new UploadTicket(key, url, "PUT", Map.of("Content-Type", contentType));
    }

    @Override
    public String signedUrl(String key, Duration ttl, String fileName, boolean attachment) {
        if (key == null) return null;
        var get = GetObjectRequest.builder().bucket(bucket).key(key);
        if (fileName != null && !fileName.isBlank()) {
            var cd = (attachment ? ContentDisposition.attachment() : ContentDisposition.inline())
                    .filename(fileName, StandardCharsets.UTF_8).build();
            get.responseContentDisposition(cd.toString());
        }
        var req = GetObjectPresignRequest.builder().signatureDuration(ttl).getObjectRequest(get.build()).build();
        return presigner.presignGetObject(req).url().toString();
    }

    @Override
    public long size(String key) {
        try {
            return client.headObject(HeadObjectRequest.builder().bucket(bucket).key(key).build()).contentLength();
        } catch (S3Exception e) {
            if (e.statusCode() == 404) return -1;
            throw e;
        }
    }

    @Override
    public void delete(String key) {
        try {
            client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (Exception e) {
            log.warn("Could not delete {}: {}", key, e.getMessage());
        }
    }

    @PreDestroy
    void close() {
        presigner.close();
        client.close();
    }
}
