async function loadNTT() {
    const wasm = await WebAssembly.instantiateStreaming(
        fetch("ntt.wasm")
    );
    return wasm.instance.exports;
}

// 1. Pure JavaScript version of the math (for comparison)
function js_pointwise_mul(r, zeta) {
    const Q = 3329;
    const QINV = 62209;
    
    // We loop 8 times (Simulating what SIMD does in 1 step)
    for (let i = 0; i < 8; i++) {
        let a = r[i] * zeta[i];
        
        // Montgomery Reduction (The math logic from C)
        let t = (a * QINV) & 0xFFFF;
        let result = (a - t * Q) >> 16;
        
        r[i] = result; 
    }
}

(async () => {
    const kyber = await loadNTT();

    // Setup Data
    const r_data = new Int16Array([10, 20, 30, 40, 50, 60, 70, 80]);
    const z_data = new Int16Array([5, 5, 5, 5, 5, 5, 5, 5]);

    // Setup Wasm Memory (Safe Location 2048)
    const mem = new Int16Array(kyber.memory.buffer);
    const r_ptr = 2048;
    const z_ptr = 2048 + 32;

    // --- BENCHMARK CONFIGURATION ---
    const ITERATIONS = 1_000_000; // Run 1 million times
    console.log(`Starting Benchmark (${ITERATIONS} iterations)...`);

    // --- TEST 1: JavaScript Performance ---
    const startJS = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        js_pointwise_mul(r_data, z_data);
    }
    const endJS = performance.now();
    const timeJS = endJS - startJS;

    // --- TEST 2: WebAssembly (SIMD) Performance ---
    // Load data into Wasm memory once for the loop
    mem.set(r_data, r_ptr / 2);
    mem.set(z_data, z_ptr / 2);
    
    const startWasm = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        kyber.ntt8(r_ptr, z_ptr);
    }
    const endWasm = performance.now();
    const timeWasm = endWasm - startWasm;

    // --- REPORT RESULTS ---
    console.log("------------------------------------------------");
    console.log(`JavaScript Time:       ${timeJS.toFixed(2)} ms`);
    console.log(`WebAssembly/SIMD Time: ${timeWasm.toFixed(2)} ms`);
    console.log("------------------------------------------------");
    
    const ratio = timeJS / timeWasm;
    console.log(`🚀 Improvement Ratio:  ${ratio.toFixed(2)}x FASTER`);
    console.log("------------------------------------------------");
})();
