// kyber.js - Final Benchmark Version

async function loadNTT() {
    // Load the compiled Wasm file
    const wasm = await WebAssembly.instantiateStreaming(
        fetch("ntt.wasm")
    );
    return wasm.instance.exports;
}

// --- STANDARD JAVASCRIPT VERSION (The "Baseline") ---
// This simulates how a normal website would do the math (slowly)
function js_pointwise_mul(r, zeta) {
    const Q = 3329;
    const QINV = 62209;
    
    // Loop 8 times for the 8 numbers (Standard sequential math)
    for (let i = 0; i < 8; i++) {
        let a = r[i] * zeta[i];
        let t = (a * QINV) & 0xFFFF;
        let result = (a - t * Q) >> 16;
        r[i] = result; 
    }
}

(async () => {
    const kyber = await loadNTT();

    // 1. DATA SETUP
    // We use random numbers to simulate real encryption data
    const r_data = new Int16Array([10, 20, 30, 40, 50, 60, 70, 80]);
    const z_data = new Int16Array([5, 5, 5, 5, 5, 5, 5, 5]);

    // 2. MEMORY SETUP (Safe Location at 2048 to avoid errors)
    const mem = new Int16Array(kyber.memory.buffer);
    const r_ptr = 2048;
    const z_ptr = 2048 + 32;

    // Copy data into Wasm memory
    mem.set(r_data, r_ptr / 2);
    mem.set(z_data, z_ptr / 2);

    // --- BENCHMARK CONFIGURATION ---
    // We run 1 Million iterations to catch even the smallest speed difference
    const ITERATIONS = 1_000_000; 
    console.log(`Starting Benchmark (${ITERATIONS} iterations)...`);

    // --- TEST 1: JavaScript Performance ---
    const startJS = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        js_pointwise_mul(r_data, z_data);
    }
    const endJS = performance.now();
    
    // --- TEST 2: WebAssembly SIMD Performance ---
    const startWasm = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        // This single call does all 8 multiplications at once using SIMD
        kyber.ntt8(r_ptr, z_ptr);
    }
    const endWasm = performance.now();

    // --- CALCULATIONS ---
    // Convert total time (ms) to average time per run (microseconds)
    // Formula: (Total_ms * 1000) / Count
    const timeJS_total = endJS - startJS;
    const avgJS_micro = (timeJS_total * 1000) / ITERATIONS;

    const timeWasm_total = endWasm - startWasm;
    const avgWasm_micro = (timeWasm_total * 1000) / ITERATIONS;
    
    const ratio = avgJS_micro / avgWasm_micro;

    // --- FINAL OUTPUT ---
    console.log("==========================================");
    console.log("      PERFORMANCE RESULTS (Average)       ");
    console.log("==========================================");
    console.log(`JS Implementation:        ${avgJS_micro.toFixed(2)} μs`);
    console.log(`Pointwise Multiplication: ${avgWasm_micro.toFixed(2)} μs`);
    console.log("------------------------------------------");
    console.log(`Improvement Ratio:        ${ratio.toFixed(2)}x FASTER`);
    console.log("==========================================");
})();
