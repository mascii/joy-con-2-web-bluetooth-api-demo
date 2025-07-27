export function* generateLEDPattern(): Generator<number, number> {
  while (true) {
    yield 0x01;
    yield 0x03;
    yield 0x07;
    yield 0x0f;
    yield 0x09;
    yield 0x05;
    yield 0x0d;
    yield 0x06;
  }
}
