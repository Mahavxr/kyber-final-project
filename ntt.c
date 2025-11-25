#include <stdint.h>
#include <wasm_simd128.h>

#define Q 3329
#define QINV 62209   // (-q)^(-1) mod 2^16

// Montgomery reduction for 8 lanes (SIMD)
v128_t montgomery_reduce_simd(v128_t a) {
    v128_t qinv = wasm_i16x8_splat(QINV);
    v128_t qvec = wasm_i16x8_splat(Q);

    // t = (a * QINV) mod 2^16
    v128_t t = wasm_i16x8_mul(a, qinv);

    // (t * q)
    v128_t tq = wasm_i16x8_mul(t, qvec);

    // result = (a - t*q) >> 16
    v128_t result = wasm_i16x8_shr(wasm_i16x8_sub(a, tq), 16);

    return result;
}

// Example SIMD-based multiply-8 NTT step
void ntt8(int16_t *r, const int16_t *zeta) {
    v128_t vec_r = wasm_v128_load(r);
    v128_t vec_z = wasm_v128_load(zeta);

    // multiply & reduce
    v128_t mul = wasm_i16x8_mul(vec_r, vec_z);
    v128_t red = montgomery_reduce_simd(mul);

    wasm_v128_store(r, red);
}
