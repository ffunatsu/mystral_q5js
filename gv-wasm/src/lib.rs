use byteorder::{LittleEndian, ReadBytesExt};
use lz4_flex::decompress_size_prepended;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct GvHeader {
    pub width: u32,
    pub height: u32,
    pub frame_count: u32,
    pub fps: f32,
    pub format: u32,
    pub frame_bytes: u32,
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct GvFrameIndex {
    pub address: u64,
    pub size: u64,
}

#[wasm_bindgen]
impl GvHeader {
    #[wasm_bindgen(constructor)]
    pub fn new(
        width: u32,
        height: u32,
        frame_count: u32,
        fps: f32,
        format: u32,
        frame_bytes: u32,
    ) -> Self {
        Self {
            width,
            height,
            frame_count,
            fps,
            format,
            frame_bytes,
        }
    }
}

#[wasm_bindgen]
pub fn read_gv_header(bytes: &[u8]) -> Result<GvHeader, JsValue> {
    let mut cursor = Cursor::new(bytes);
    let width = cursor
        .read_u32::<LittleEndian>()
        .map_err(|e| JsValue::from_str(&format!("read width: {e}")))?;
    let height = cursor
        .read_u32::<LittleEndian>()
        .map_err(|e| JsValue::from_str(&format!("read height: {e}")))?;
    let frame_count = cursor
        .read_u32::<LittleEndian>()
        .map_err(|e| JsValue::from_str(&format!("read frame_count: {e}")))?;
    let fps = cursor
        .read_f32::<LittleEndian>()
        .map_err(|e| JsValue::from_str(&format!("read fps: {e}")))?;
    let format = cursor
        .read_u32::<LittleEndian>()
        .map_err(|e| JsValue::from_str(&format!("read format: {e}")))?;
    let frame_bytes = cursor
        .read_u32::<LittleEndian>()
        .map_err(|e| JsValue::from_str(&format!("read frame_bytes: {e}")))?;

    Ok(GvHeader {
        width,
        height,
        frame_count,
        fps,
        format,
        frame_bytes,
    })
}

#[wasm_bindgen]
pub fn read_gv_frame_index(bytes: &[u8], frame_count: u32) -> Result<Vec<GvFrameIndex>, JsValue> {
    if frame_count == 0 {
        return Ok(Vec::new());
    }

    let required = (frame_count as usize) * 16usize;
    let len = bytes.len();
    if len < required {
        return Err(JsValue::from_str(&format!(
            "frame table too short: need at least {required} bytes but got {len}"
        )));
    }

    let start = len - required;
    let mut out = Vec::with_capacity(frame_count as usize);
    let mut cursor = Cursor::new(&bytes[start..]);

    for _ in 0..frame_count {
        let address = cursor
            .read_u64::<LittleEndian>()
            .map_err(|e| JsValue::from_str(&format!("read address: {e}")))?;
        let size = cursor
            .read_u64::<LittleEndian>()
            .map_err(|e| JsValue::from_str(&format!("read size: {e}")))?;
        out.push(GvFrameIndex { address, size });
    }

    Ok(out)
}

#[wasm_bindgen]
pub fn decompress_lz4_block(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    let mut prepended = vec![0u8; 4];
    prepended.extend_from_slice(data);
    let decompressed = decompress_size_prepended(&prepended)
        .map_err(|e| JsValue::from_str(&format!("LZ4 decompress failed: {e}")))?;
    Ok(decompressed)
}

#[wasm_bindgen]
pub fn gv_is_supported_format(format: u32) -> bool {
    matches!(format, 1 | 3 | 5 | 7)
}
