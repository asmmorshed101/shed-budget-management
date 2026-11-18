
package com.govbudget.management.operational.expenditure.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${app.file.upload-dir:uploads/operational-expenditures}")
    private String uploadDir;

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    private static final Set<String> ALLOWED_EXTENSIONS =
            Set.of("pdf", "jpg", "jpeg", "png");

    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of(
                    "application/pdf",
                    "image/jpeg",
                    "image/png"
            );

    // Store file
    public String storeFile(MultipartFile file) {

        if (file == null || file.isEmpty()) {
            return null;
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException(
                    "File size cannot exceed 5 MB"
            );
        }

        String originalName = file.getOriginalFilename();

        if (originalName == null || originalName.isBlank()) {
            throw new RuntimeException("Invalid file name");
        }

        String extension = getExtension(originalName);

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new RuntimeException(
                    "Only PDF, JPG, JPEG and PNG files are allowed"
            );
        }

        String contentType = file.getContentType();

        if (contentType == null
                || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new RuntimeException("Invalid file content type");
        }

        try {
            Path directory = Paths.get(uploadDir)
                    .toAbsolutePath()
                    .normalize();

            Files.createDirectories(directory);

            String storedFileName =
                    UUID.randomUUID() + "." + extension;

            Path targetPath = directory
                    .resolve(storedFileName)
                    .normalize();

            if (!targetPath.startsWith(directory)) {
                throw new RuntimeException("Invalid file path");
            }

            Files.copy(file.getInputStream(), targetPath);

            return storedFileName;

        } catch (IOException e) {
            throw new RuntimeException(
                    "Could not store file: " + e.getMessage()
            );
        }
    }

    // Load file
    public Resource loadFile(String fileName) {

        try {
            Path directory = Paths.get(uploadDir)
                    .toAbsolutePath()
                    .normalize();

            Path filePath = directory
                    .resolve(fileName)
                    .normalize();

            if (!filePath.startsWith(directory)) {
                throw new RuntimeException("Invalid file path");
            }

            Resource resource = new UrlResource(
                    filePath.toUri()
            );

            if (resource.exists() && resource.isReadable()) {
                return resource;
            }

            throw new RuntimeException("File not found");

        } catch (IOException e) {
            throw new RuntimeException(
                    "Could not read file: " + e.getMessage()
            );
        }
    }

    // Delete file
    public void deleteFile(String fileName) {

        if (fileName == null || fileName.isBlank()) {
            return;
        }

        try {
            Path directory = Paths.get(uploadDir)
                    .toAbsolutePath()
                    .normalize();

            Path filePath = directory
                    .resolve(fileName)
                    .normalize();

            if (!filePath.startsWith(directory)) {
                throw new RuntimeException("Invalid file path");
            }

            Files.deleteIfExists(filePath);

        } catch (IOException e) {
            throw new RuntimeException(
                    "Could not delete file: " + e.getMessage()
            );
        }
    }

    private String getExtension(String fileName) {

        int lastDot = fileName.lastIndexOf('.');

        if (lastDot < 0 || lastDot == fileName.length() - 1) {
            throw new RuntimeException("File extension is required");
        }

        return fileName.substring(lastDot + 1).toLowerCase();
    }
}
