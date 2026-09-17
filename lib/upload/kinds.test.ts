import { describe, expect, it } from "vitest";

import { MAX_UPLOAD_BYTES, checkFile, classifyFile, formatBytes, numberedFileName, projectAcceptsUploads, safeFileName } from "./kinds";

const f = (name: string, type = "", size = 10) => ({ name, type, size });

describe("classifyFile", () => {
  it("recognizes pictures and videos by MIME type or extension", () => {
    expect(classifyFile(f("a.jpg", "image/jpeg"))).toBe("pictures");
    expect(classifyFile(f("IMG_0001.HEIC"))).toBe("pictures");
    expect(classifyFile(f("scan.RAW"))).toBe("pictures");
    expect(classifyFile(f("clip.mov", "video/quicktime"))).toBe("videos");
    expect(classifyFile(f("clip.MP4"))).toBe("videos");
  });
  it("falls back to files for anything else — the 'else' bucket", () => {
    expect(classifyFile(f("brief.pdf", "application/pdf"))).toBe("files");
    expect(classifyFile(f("model.stl"))).toBe("files");
    expect(classifyFile(f("archive.zip", "application/zip"))).toBe("files");
    expect(classifyFile(f("noextension"))).toBe("files");
  });
});

describe("checkFile", () => {
  it("accepts and classifies good files", () => {
    expect(checkFile(f("a.jpg", "image/jpeg"))).toEqual({ ok: true, kind: "pictures" });
    expect(checkFile(f("clip.mov", "video/quicktime"))).toEqual({ ok: true, kind: "videos" });
    expect(checkFile(f("model.stl"))).toEqual({ ok: true, kind: "files" });
  });
  it("blocks executables and oversized files regardless of type", () => {
    expect(checkFile(f("setup.EXE"))).toMatchObject({ ok: false, reason: "blocked" });
    expect(checkFile(f("run.sh"))).toMatchObject({ ok: false, reason: "blocked" });
    expect(checkFile(f("big.mov", "video/quicktime", MAX_UPLOAD_BYTES + 1))).toMatchObject({ ok: false, reason: "too_large" });
  });
});

describe("file names", () => {
  it("keeps names flat and printable", () => {
    expect(safeFileName("a/b\\c.txt")).toBe("a-b-c.txt");
    expect(safeFileName("..")).toBe("upload");
    expect(safeFileName("  ")).toBe("upload");
    expect(safeFileName("Café logo (final) #2.png")).toBe("Café logo (final) #2.png");
  });
  it("numbers duplicates before the extension", () => {
    expect(numberedFileName("photo.jpg", 0)).toBe("photo.jpg");
    expect(numberedFileName("photo.jpg", 2)).toBe("photo (2).jpg");
    expect(numberedFileName("README", 1)).toBe("README (1)");
    expect(numberedFileName(".env", 1)).toBe(".env (1)");
  });
  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 ** 3)).toBe("5.0 GB");
  });
});

describe("projectAcceptsUploads", () => {
  it("only allows visible, open projects", () => {
    expect(projectAcceptsUploads({ status: "in_progress", clientVisible: true })).toBe(true);
    expect(projectAcceptsUploads({ status: "on_hold", clientVisible: true })).toBe(true);
    expect(projectAcceptsUploads({ status: "completed", clientVisible: true })).toBe(false);
    expect(projectAcceptsUploads({ status: "cancelled", clientVisible: true })).toBe(false);
    expect(projectAcceptsUploads({ status: "planned", clientVisible: false })).toBe(false);
  });
});
