import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const STACK_MAX = 256;
const CALLS_MAX = 64;
const MEMORY_WORDS = 256;
const STEP_LIMIT = 1_000_000;
const OUTPUT_MAX = 65_536;

const TRAP = {
  UNDERFLOW: 2,
  OVERFLOW: 3,
  DIV_ZERO: 4,
  BAD_OPCODE: 5,
  MEMORY: 6,
  CALL_DEPTH: 7,
  RET_EMPTY: 8,
  PC: 9,
  STEPS: 10,
  OUTPUT: 11,
} as const;

const textEncoder = new TextEncoder();

function runVM(program: Uint8Array, input: Uint8Array): { stdout: Uint8Array; exit: number } {
  const n = program.length;
  const D = new Int32Array(STACK_MAX);
  let sp = 0;
  const C = new Int32Array(CALLS_MAX);
  let csp = 0;
  const M = new Int32Array(MEMORY_WORDS);
  const out = new Uint8Array(OUTPUT_MAX);
  let olen = 0;
  let inPos = 0;
  let pc = 0;
  let steps = 0;

  while (true) {
    if (steps === STEP_LIMIT) return { stdout: out.slice(0, olen), exit: TRAP.STEPS };
    if (pc < 0 || pc >= n) return { stdout: out.slice(0, olen), exit: TRAP.PC };

    const opcode = program[pc];

    switch (opcode) {
      case 0x00: // HALT
        return { stdout: out.slice(0, olen), exit: 0 };

      case 0x01: // PUSH8
        if (pc + 1 >= n) return { stdout: out.slice(0, olen), exit: TRAP.PC };
        if (sp >= STACK_MAX) return { stdout: out.slice(0, olen), exit: TRAP.OVERFLOW };
        D[sp++] = (program[pc + 1] << 24) >> 24;
        pc += 2;
        break;

      case 0x02: // PUSH32
        if (pc + 4 >= n) return { stdout: out.slice(0, olen), exit: TRAP.PC };
        if (sp >= STACK_MAX) return { stdout: out.slice(0, olen), exit: TRAP.OVERFLOW };
        D[sp++] = program[pc + 1] | (program[pc + 2] << 8) | (program[pc + 3] << 16) | (program[pc + 4] << 24);
        pc += 5;
        break;

      case 0x03: // POP
        if (sp < 1) return { stdout: out.slice(0, olen), exit: TRAP.UNDERFLOW };
        sp--;
        pc++;
        break;

      case 0x04: // DUP
        if (sp < 1) return { stdout: out.slice(0, olen), exit: TRAP.UNDERFLOW };
        if (sp + 1 > STACK_MAX) return { stdout: out.slice(0, olen), exit: TRAP.OVERFLOW };
        D[sp] = D[sp - 1];
        sp++;
        pc++;
        break;

      case 0x05: // SWAP
        if (sp < 2) return { stdout: out.slice(0, olen), exit: TRAP.UNDERFLOW };
        {
          const t = D[sp - 1];
          D[sp - 1] = D[sp - 2];
          D[sp - 2] = t;
        }
        pc++;
        break;

      case 0x06: // OVER
        if (sp < 2) return { stdout: out.slice(0, olen), exit: TRAP.UNDERFLOW };
        if (sp + 1 > STACK_MAX) return { stdout: out.slice(0, olen), exit: TRAP.OVERFLOW };
        D[sp] = D[sp - 2];
        sp++;
        pc++;
        break;

      case 0x07: // ROT
        if (sp < 3) return { stdout: out.slice(0, olen), exit: TRAP.UNDERFLOW };
        {
          const a = D[sp - 3];
          D[sp - 3] = D[sp - 2];
          D[sp - 2] = D[sp - 1];
          D[sp - 1] = a;
        }
        pc++;
        break;

      case 0x10: // ADD
      case 0x11: // SUB
      case 0x12: // MUL
      case 0x13: // DIV
      case 0x14: // MOD
      case 0x15: // DIVU
      case 0x16: // MODU
      case 0x18: // AND
      case 0x19: // OR
      case 0x1A: // XOR
      case 0x1C: // SHL
      case 0x1D: // SHR
      case 0x1E: // SHRU
      case 0x20: // EQ
      case 0x21: // LT
      case 0x22: { // LTU
        if (sp < 2) return { stdout: out.slice(0, olen), exit: TRAP.UNDERFLOW };
        const b = D[sp - 1];
        const a = D[sp - 2];
        let r: number;
        switch (opcode) {
          case 0x10: r = (a + b) | 0; break; // ADD
          case 0x11: r = (a - b) | 0; break; // SUB
          case 0x12: r = Math.imul(a, b); break; // MUL
          case 0x13: { // DIV
            if (b === 0) return { stdout: out.slice(0, olen), exit: TRAP.DIV_ZERO };
            r = (a === -2147483648 && b === -1) ? a : (a / b) | 0;
            break;
          }
          case 0x14: { // MOD
            if (b === 0) return { stdout: out.slice(0, olen), exit: TRAP.DIV_ZERO };
            r = b === -1 ? 0 : a % b | 0;
            break;
          }
          case 0x15: { // DIVU
            if (b === 0) return { stdout: out.slice(0, olen), exit: TRAP.DIV_ZERO };
            r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
            break;
          }
          case 0x16: { // MODU
            if (b === 0) return { stdout: out.slice(0, olen), exit: TRAP.DIV_ZERO };
            r = (a >>> 0) % (b >>> 0) | 0;
            break;
          }
          case 0x18: r = a & b; break; // AND
          case 0x19: r = a | b; break; // OR
          case 0x1A: r = a ^ b; break; // XOR
          case 0x1C: r = a << (b & 31); break; // SHL
          case 0x1D: r = a >> (b & 31); break; // SHR
          case 0x1E: r = (a >>> (b & 31)) | 0; break; // SHRU
          case 0x20: r = (a === b) ? 1 : 0; break; // EQ
          case 0x21: r = (a < b) ? 1 : 0; break; // LT
          case 0x22: r = ((a >>> 0) < (b >>> 0)) ? 1 : 0; break; // LTU
          default: return { stdout: out.slice(0, olen), exit: TRAP.BAD_OPCODE };
        }
        sp -= 2;
        D[sp++] = r;
        pc++;
        break;
      }

      case 0x17: // NEG
        if (sp < 1) return { stdout: out.slice(0, olen), exit: TRAP.UNDERFLOW };
        D[sp - 1] = -D[sp - 1] | 0;
        pc++;
        break;

      case 0x1B: // NOT
        if (sp < 1) return { stdout: out.slice(0, olen), exit: TRAP.UNDERFLOW };
        D[sp - 1] = ~D[sp - 1];
        pc++;
        break;

      case 0x30: // JMP
      case 0x31: // JZ
      case 0x32: { // JNZ
        if (pc + 2 >= n) return { stdout: out.slice(0, olen), exit: TRAP.PC };
        const rel = ((program[pc + 1] | (program[pc + 2] << 8)) << 16) >> 16;
        const next = pc + 3;
        let take = true;
        if (opcode !== 0x30) {
          if (sp < 1) return { stdout: out.slice(0, olen), exit: TRAP.UNDERFLOW };
          const v = D[--sp];
          take = opcode === 0x31 ? v === 0 : v !== 0;
        }
        pc = take ? next + rel : next;
        break;
      }

      case 0x33: { // CALL
        if (pc + 2 >= n) return { stdout: out.slice(0, olen), exit: TRAP.PC };
        if (csp === CALLS_MAX) return { stdout: out.slice(0, olen), exit: TRAP.CALL_DEPTH };
        const next = pc + 3;
        C[csp++] = next;
        pc = program[pc + 1] | (program[pc + 2] << 8);
        break;
      }

      case 0x34: // RET
        if (csp === 0) return { stdout: out.slice(0, olen), exit: TRAP.RET_EMPTY };
        pc = C[--csp];
        break;

      case 0x40: { // LOAD
        if (sp < 1) return { stdout: out.slice(0, olen), exit: TRAP.UNDERFLOW };
        const addr = D[sp - 1];
        if (addr < 0 || addr >= MEMORY_WORDS) return { stdout: out.slice(0, olen), exit: TRAP.MEMORY };
        D[sp - 1] = M[addr];
        pc++;
        break;
      }

      case 0x41: { // STORE
        if (sp < 2) return { stdout: out.slice(0, olen), exit: TRAP.UNDERFLOW };
        const addr = D[sp - 1];
        const v = D[sp - 2];
        if (addr < 0 || addr >= MEMORY_WORDS) return { stdout: out.slice(0, olen), exit: TRAP.MEMORY };
        sp -= 2;
        M[addr] = v;
        pc++;
        break;
      }

      case 0x50: { // PRINT
        if (sp < 1) return { stdout: out.slice(0, olen), exit: TRAP.UNDERFLOW };
        const str = String(D[sp - 1]);
        const bytes = textEncoder.encode(str);
        if (olen + bytes.length > OUTPUT_MAX) return { stdout: out.slice(0, olen), exit: TRAP.OUTPUT };
        sp--;
        out.set(bytes, olen);
        olen += bytes.length;
        pc++;
        break;
      }

      case 0x51: { // PUTC
        if (sp < 1) return { stdout: out.slice(0, olen), exit: TRAP.UNDERFLOW };
        if (olen + 1 > OUTPUT_MAX) return { stdout: out.slice(0, olen), exit: TRAP.OUTPUT };
        out[olen++] = D[--sp] & 255;
        pc++;
        break;
      }

      case 0x52: { // IN
        if (sp >= STACK_MAX) return { stdout: out.slice(0, olen), exit: TRAP.OVERFLOW };
        D[sp++] = inPos < input.length ? input[inPos++] : -1;
        pc++;
        break;
      }

      case 0x53: { // EXIT
        if (sp < 1) return { stdout: out.slice(0, olen), exit: TRAP.UNDERFLOW };
        return { stdout: out.slice(0, olen), exit: D[--sp] & 255 };
      }

      default:
        return { stdout: out.slice(0, olen), exit: TRAP.BAD_OPCODE };
    }

    steps++;
  }
}

export function run(program: Uint8Array, input: Uint8Array): { out: Uint8Array; exit: number } {
  const { stdout, exit } = runVM(program, input);
  return { out: stdout, exit };
}

function main() {
  const inputDir = process.env.MAKEFUN_INPUT_DIR;
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR;

  if (!inputDir || !outputDir) {
    console.error("MAKEFUN_INPUT_DIR and MAKEFUN_OUTPUT_DIR must be set");
    process.exit(1);
  }

  const entries = readdirSync(inputDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("i")) continue;

    const id = entry.name;
    const programPath = join(inputDir, id, "program.bin");
    const inputPath = join(inputDir, id, "input.bin");
    const stdoutPath = join(outputDir, id, "stdout.bin");
    const exitPath = join(outputDir, id, "exit.txt");

    try {
      const program = new Uint8Array(readFileSync(programPath));
      const input = new Uint8Array(readFileSync(inputPath));
      const { stdout, exit } = runVM(program, input);
      const outDir = join(outputDir, id);
      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
      }
      writeFileSync(stdoutPath, stdout);
      writeFileSync(exitPath, String(exit) + "\n");
    } catch (e) {
      console.error(`Failed to process ${id}:`, e);
      process.exit(1);
    }
  }
}

main();