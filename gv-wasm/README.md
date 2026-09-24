# gv-wasm

WASM project for Mystral GV integration.

This subproject provides the Mystral raw-WASM ABI around the existing `refs/rust-gv-video` decoder. The native side remains responsible for generic file I/O only; GV parsing, LZ4 decompression, and frame access stay in the Rust decoder layer.

## Layout

- `src/lib.rs` exposes the Mystral raw-WASM ABI and delegates GV header, compressed-frame, and RGBA-frame decoding to `rust-gv-video`.
- The current ABI uses an in-memory `Cursor` reader. A random-access Mystral reader can be added later without replacing the decoder crate.

## JavaScript player API

`loadGvVideo()` returns a JS-oriented player object:

```js
const video = await loadGvVideo('./movie.gv', { wasmPath: './gv-wasm.wasm' });
video.setLoop(true);
video.play();

const rgbaFrame = await video.update();
```

The player provides `play()`, `pause()`, `stop()`, `seek(seconds)`, `setLoop(value)`, `currentFrame`, `currentTime`, `duration`, and `update()`. `update()` returns a Promise only when a new frame needs decoding; otherwise it returns `null`.
- `Cargo.toml` configures a `wasm32` build target suitable for Mystral integration.

## Build

```bash
cargo build --target wasm32-unknown-unknown --release
cp target/wasm32-unknown-unknown/release/gv_wasm.wasm .
```

If the target is not installed yet:

```bash
rustup target add wasm32-unknown-unknown
```
