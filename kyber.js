async function loadNTT() {
    const wasm = await WebAssembly.instantiateStreaming(
        fetch("ntt.wasm")
    );
    return wasm.instance.exports;
}

(async () => {
    const kyber = await loadNTT();

    // Example test data (8 coefficients)
    const r = new Int16Array([10, 20, 30, 40, 50, 60, 70, 80]);
    const zeta = new Int16Array([5, 5, 5, 5, 5, 5, 5, 5]);

    // allocate memory in Wasm
    const mem = new Int16Array(kyber.memory.buffer);
    const r_ptr = 0;
    const z_ptr = 16;

    mem.set(r, r_ptr / 2);
    mem.set(zeta, z_ptr / 2);

    // Call SIMD NTT step
    kyber.ntt8(r_ptr, z_ptr);

    console.log("Output:", mem.slice(0, 8));
})();
