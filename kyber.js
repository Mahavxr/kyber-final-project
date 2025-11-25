async function loadNTT() {
    const wasm = await WebAssembly.instantiateStreaming(
        fetch("ntt.wasm")
    );
    return wasm.instance.exports;
}

(async () => {
    const kyber = await loadNTT();

    // 1. Define the data
    const r = new Int16Array([10, 20, 30, 40, 50, 60, 70, 80]);
    const zeta = new Int16Array([5, 5, 5, 5, 5, 5, 5, 5]);

    // 2. SAFE MEMORY LOCATIONS (Offset 2048 to avoid Stack overwrites)
    // Note: JS uses "Index" (2 bytes each), Wasm uses "Bytes"
    const r_byte_offset = 2048; 
    const z_byte_offset = 2048 + 32; // slightly more space to be safe
    
    const r_index = r_byte_offset / 2;
    const z_index = z_byte_offset / 2;

    // 3. Write data to Wasm Memory
    const mem = new Int16Array(kyber.memory.buffer);
    mem.set(r, r_index);
    mem.set(zeta, z_index);

    // DEBUG: Prove data is there BEFORE the run
    console.log("DEBUG - Input at 2048:", mem.slice(r_index, r_index + 8));

    // 4. Run the C code (Pass BYTE offsets, not indexes)
    kyber.ntt8(r_byte_offset, z_byte_offset);

    // 5. Read the result
    // CRITICAL: We slice from r_index, NOT 0!
    console.log("Output - Result at 2048:", mem.slice(r_index, r_index + 8));
})();
