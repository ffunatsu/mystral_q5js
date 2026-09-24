# gv-wasm

WASM project for Mystral GV integration.

This subproject is intended to host the GV decoder and stream-oriented parsing logic used by the JS layer. The native side remains responsible for generic file I/O only; the decode and frame pipeline live in this Rust/WASM module.

## Layout

- `src/lib.rs` contains the baseline GV header parsing, frame table extraction, and LZ4 decompression helpers.
- `Cargo.toml` configures a `wasm32` build target suitable for Mystral integration.

## Build

```bash
cargo build --target wasm32-unknown-unknown --release
```

If the target is not installed yet:

```bash
rustup target add wasm32-unknown-unknown
```
