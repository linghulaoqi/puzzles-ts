/** Pure Rectangles clue encoder extracted for offline generation consumers. */
export function encodeNumbers(numbers: ArrayLike<number>, area: number): string {
  let out = "";
  let run = 0;
  for (let index = 0; index <= area; index++) {
    const number = index < area ? numbers[index] : -1;
    if (number === 0) {
      run++;
    } else {
      if (run) {
        while (run > 0) {
          let character = "a".charCodeAt(0) - 1 + run;
          if (run > 26) character = "z".charCodeAt(0);
          out += String.fromCharCode(character);
          run -= character - ("a".charCodeAt(0) - 1);
        }
      } else if (out.length > 0 && number > 0) {
        out += "_";
      }
      if (number > 0) out += String(number);
      run = 0;
    }
  }
  return out;
}
