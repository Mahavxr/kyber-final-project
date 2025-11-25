// kyber_wasm.c
#include <stdint.h>
#include <stddef.h>
#include <string.h>

// If compiling with emscripten + simd, include wasm_simd128.h for intrinsics (optional)
#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif

// Kyber constants for Kyber-768 (k = 3)
#define KYBER_N 256
#define KYBER_Q 3329
#define MONTGOMERY_QINV 62209    // precomputed -q^{-1} mod 2^16
#define MONT_RLOG 16

// Exported memory interface will be provided by Emscripten; functions take offsets to int16 arrays.

// A few helper reductions (naive versions, but efficient).
static inline int16_t montgomery_reduce(int32_t a) {
    // a is up to ~ (32-bit) result of 16*16 multiplication
    int32_t t = (int32_t)((uint32_t)(a * MONTGOMERY_QINV) & 0xFFFF);
    int32_t u = (a - t * KYBER_Q) >> 16;
    return (int16_t)u;
}

static inline int16_t barrett_reduce(int16_t a) {
    int32_t t = (int32_t)((((int32_t)169 * a) + (1<<20)) >> 21); // approximate as in reference
    int16_t r = a - t * KYBER_Q;
    if(r < 0) r += KYBER_Q;
    return r;
}

// Placeholder twiddle arrays; in practice fill them with Kyber zetas (from spec)
static const int16_t zetas[KYBER_N/2] = {
    // (fill with spec values) — FOR PRODUCTION, replace with official zeta array
    // to keep the example runnable, we present a very small inicializer.
    2285, 695, 923, 1725, /* ... remaining values up to 128 entries ... */
};

// Simple non-SIMD NTT implementation (works everywhere). You can replace with SIMD intrinsics.
void ntt_inplace(int16_t *r) {
    // Cooley-Tukey iterative NTT (reference-style). This is a straightforward implementation; optimized versions rearrange loops.
    int16_t len, start, j, k, zeta;
    for(len = 128, k = 0; len >= 1; len >>= 1) {
        for(start = 0; start < KYBER_N; start = j + len) {
            zeta = zetas[k++];
            for(j = start; j < start + len; ++j) {
                int16_t t = montgomery_reduce((int32_t)zeta * r[j + len]);
                int16_t u = r[j];
                r[j + len] = u - t;
                if (r[j + len] < 0) r[j + len] += KYBER_Q;
                r[j] = u + t;
                if (r[j] >= KYBER_Q) r[j] -= KYBER_Q;
            }
        }
    }
}

// Inverse NTT (reference) — actual Kyber uses specific inverse sequence and bit shifts.
void invntt_inplace(int16_t *r) {
    // For brevity: placeholder inverse with same structure reversed.
    // Replace with spec-correct invntt (including final multiplication by f)
    int16_t len, start, j, k;
    k = 0;
    for(len = 1; len <= 128; len <<= 1) {
        for(start = 0; start < KYBER_N; start = j + len) {
            int16_t zeta = zetas[k++]; // Inverse zeta set required; placeholder
            for(j = start; j < start + len; ++j) {
                int16_t u = r[j];
                int16_t v = r[j + len];
                r[j] = barrett_reduce(u + v);
                r[j + len] = montgomery_reduce((int32_t)(u - v + KYBER_Q) * zeta);
            }
        }
    }
    // multiply by final factor (placeholder)
    for(int i=0;i<KYBER_N;i++){
        // multiply by inv_n constant — placeholder
        // In production use exact inv_n mod q (i.e., 3327 etc.)
    }
}

// Pointwise multiplication of two polys in NTT domain: r = a * b
void basemul(int16_t *r, const int16_t *a, const int16_t *b) {
    for (int i = 0; i < KYBER_N; i++) {
        int32_t prod = (int32_t)a[i] * b[i];
        r[i] = montgomery_reduce(prod);
    }
}

// Exported wrappers consumed by JS: these receive pointers (offsets) into wasm memory.
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
void wasm_ntt(int16_t *ptr) {
    ntt_inplace(ptr);
}

EMSCRIPTEN_KEEPALIVE
void wasm_invntt(int16_t *ptr) {
    invntt_inplace(ptr);
}

EMSCRIPTEN_KEEPALIVE
void wasm_basemul(int16_t *r_ptr, const int16_t *a_ptr, const int16_t *b_ptr) {
    basemul(r_ptr, a_ptr, b_ptr);
}

// Convenience: allocate a poly-sized buffer in wasm heap and return pointer
EMSCRIPTEN_KEEPALIVE
int wasm_alloc_poly() {
    int16_t *p = (int16_t*)malloc(KYBER_N * sizeof(int16_t));
    return (int)p;
}
EMSCRIPTEN_KEEPALIVE
void wasm_free_poly(int ptr) {
    free((void*)ptr);
}
