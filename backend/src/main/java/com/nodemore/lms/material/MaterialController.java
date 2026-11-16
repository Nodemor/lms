package com.nodemore.lms.material;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class MaterialController {

    private final MaterialService service;

    @GetMapping("/api/classes/{classId}/materials")
    public List<MaterialService.MaterialDto> list(@PathVariable UUID classId) { return service.list(classId); }

    @PostMapping("/api/teacher/classes/{classId}/materials")
    public MaterialService.MaterialDto create(@PathVariable UUID classId, @Valid @RequestBody MaterialService.MaterialRequest req) {
        return service.create(classId, req);
    }

    @PutMapping("/api/teacher/classes/{classId}/materials/{id}")
    public MaterialService.MaterialDto update(@PathVariable UUID classId, @PathVariable UUID id,
                                              @Valid @RequestBody MaterialService.MaterialRequest req) {
        return service.update(classId, id, req);
    }

    @DeleteMapping("/api/teacher/classes/{classId}/materials/{id}")
    public Map<String, Object> delete(@PathVariable UUID classId, @PathVariable UUID id) {
        service.delete(classId, id);
        return Map.of("ok", true);
    }

    @GetMapping("/api/materials/{id}/url")
    public Map<String, Object> url(@PathVariable UUID id, @RequestParam(defaultValue = "false") boolean download) {
        return service.url(id, download);
    }
}
