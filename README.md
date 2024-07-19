# RiftCompiler

While custom chart can be played on Rift of the NecroDancer, currently the editor is not available, and editing JSON files directly is very annoying.

This is a simple program that enables people to create chart files quickly using simple text editors.

## How to Use

(TODO)

```bash
riftc in_file.rift -o out_file.json
```

## Chart Format

```text
[header]
bpm=120
beatDevisions=2

[body]

+.5 ---
+1  |-C
+1  |B-
=1  A--


```