#!/usr/bin/env python3
from __future__ import annotations

from fnmatch import fnmatch
from pathlib import Path

# CONFIGURATION
CONFIG = {
    # Default posture: logic-only (source + runtime-relevant config), not “everything”.
    # This keeps reports small and avoids noise from docs, assets, lockfiles, and local data.
    "logic_only": True,

    # Hard allowlist: only include paths under src/.
    # This repo uses project-reporter for code (logic) ingestion, not infra/docs.
    "include_globs": ["src/**"],

    # Directories to exclude anywhere in the tree (by path segment).
    "exclude_paths": [
        ".git",
        ".idea",
        ".vscode",
        ".venv",
        "__pycache__",
        ".pytest_cache",
        ".mypy_cache",
        ".ruff_cache",
        "docs",
        "ops",
        "node_modules",
        "dist",
        "build",
        "coverage",
        "logs",
        "tmp",
        "data",
    ],

    # Exclude by filename (exact).
    "exclude_files": [
        ".DS_Store",
        ".env",
        ".gitignore",
        # repo tooling (non-logic for ingestion purposes)
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "vitest.config.ts",
        # lockfiles (non-logic)
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "poetry.lock",
        "Pipfile.lock",
        "uv.lock",
        "Cargo.lock",
    ],

    # Exclude by file extension (lowercased).
    "exclude_extensions": [
        # secrets / local env
        ".env",
        ".example",
        # logs / caches
        ".log",
        ".pyc",
        # docs / text (non-logic by default)
        ".md",
        ".rst",
        ".txt",
        # binaries / archives / media
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".pdf",
        ".zip",
        ".tar",
        ".gz",
        ".tgz",
        ".sqlite",
        ".db",
    ],

    # Exclude by glob against POSIX relative path.
    # Examples: **/*.min.js, **/*.map
    "exclude_globs": [
        "ops/**/file_contents_report.txt",
        "**/*.min.js",
        "**/*.map",
    ],

    # If logic_only=True, only these extensions are included (unless explicitly allowed by include_files).
    "logic_extensions": [
        # source
        ".py",
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".mjs",
        ".cjs",
        ".go",
        ".rs",
        ".java",
        ".kt",
        ".cs",
        ".rb",
        ".php",
        ".sh",
        ".bash",
        ".zsh",
        ".sql",
        ".graphql",
        ".proto",
        # config that affects behavior
        ".json",
        ".yaml",
        ".yml",
        ".toml",
        ".ini",
        ".cfg",
    ],

    # Always include by exact filename (even if logic_only=True). Keep empty unless needed.
    "include_files": [],

    "output_file": "file_contents_report.txt",
}

def find_project_root(start_path: Path) -> Path:
    """
    Walk up from start_path until a .git directory is found, or return start_path if not found.
    """
    current = start_path.resolve()
    for parent in [current] + list(current.parents):
        if (parent / ".git").is_dir():
            return parent
    return start_path

def _rel_posix(path: Path, project_root: Path) -> str:
    return path.relative_to(project_root).as_posix()

def _is_included(rel_posix: str) -> bool:
    include = CONFIG.get("include_globs", [])
    if not include:
        return True
    # ensure `src/` directory itself is included when allowlisting `src/**`
    if rel_posix == "src":
        return True
    return any(fnmatch(rel_posix, pat) for pat in include)

def should_exclude(file_path: Path, script_path: Path, project_root: Path) -> bool:
    if file_path.resolve() == script_path:
        return True

    # directory/path exclusions
    rel_parts = file_path.relative_to(project_root).parts
    if any(part in CONFIG["exclude_paths"] for part in rel_parts):
        return True

    rel_posix = _rel_posix(file_path, project_root)
    if not _is_included(rel_posix):
        return True
    for pat in CONFIG.get("exclude_globs", []):
        if fnmatch(rel_posix, pat):
            return True

    # Important: never apply file-extension allowlists to directories.
    # Directories should remain traversable unless explicitly excluded above.
    if file_path.is_dir():
        return False

    name = file_path.name
    suffix = file_path.suffix.lower()

    # file/extension exclusions
    if name in CONFIG["exclude_files"]:
        return True
    if suffix in CONFIG["exclude_extensions"]:
        return True

    # allowlist posture
    if CONFIG.get("logic_only", False):
        if name in CONFIG.get("include_files", []):
            return False
        if suffix not in CONFIG.get("logic_extensions", []):
            return True

    return False

def write_directory_structure(project_root: Path, out_file, indent_level=0, script_path=None):
    if script_path is None:
        script_path = Path(__file__).resolve()
        out_file.write("FULL DIRECTORY STRUCTURE\n")
        out_file.write("========================\n\n")
    def _write_dir(dir_path: Path, indent_level: int):
        # Always show directories (unless excluded), even if they only contain excluded files
        # (e.g., skeleton repos tracked via .gitkeep).
        if indent_level > 0:
            out_file.write(f"{'    ' * (indent_level-1)}{dir_path.name}/\n")

        try:
            children = sorted(dir_path.iterdir())
        except Exception:
            return

        for child in children:
            if child.is_dir():
                if should_exclude(child, script_path, project_root):
                    continue
                _write_dir(child, indent_level + 1)
            else:
                if should_exclude(child, script_path, project_root):
                    continue
                out_file.write(f"{'    ' * indent_level}{child.name}\n")
    _write_dir(project_root, 0)
    out_file.write("\n\n")

def main():
    script_path = Path(__file__).resolve()
    cwd = Path.cwd()
    project_root = find_project_root(cwd)
    # Output to the project-reporter directory
    output_path = script_path.parent / CONFIG["output_file"]
    with output_path.open("w", encoding="utf-8") as out_file:
        for file_path in project_root.rglob("*"):
            if not file_path.is_file():
                continue
            if should_exclude(file_path, script_path, project_root):
                continue
            rel_path = file_path.relative_to(project_root)
            header = f"{rel_path}\n{'-' * len(str(rel_path))}\n"
            out_file.write(header)
            try:
                content = file_path.read_text(encoding="utf-8")
            except Exception:
                continue
            out_file.write(content + "\n\n")
        write_directory_structure(project_root, out_file)
    print(f"Aggregation complete. Output written to: {output_path}")

if __name__ == "__main__":
    main() 