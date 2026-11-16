package com.nodemore.lms.settings;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "platform_settings")
public class PlatformSetting extends BaseEntity {
    @Column(name = "setting_key", nullable = false, unique = true)
    private String settingKey;
    @Column(columnDefinition = "text")
    private String value;
}
