const workercode = () => {
    let timerInterval;
    let time = 0;
    self.onmessage = function ({ data: { turn } }) {
      if (turn === "off" || timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        time = 0;
      }
      if (turn === "on") {
        timerInterval = setInterval(() => {
          time += 1;
          self.postMessage({ time });
        }, 16.666);
      }
    };
  };
  
  let code = workercode.toString();
  code = code.substring(code.indexOf("{") + 1, code.lastIndexOf("}"));
  
  const blob = new Blob([code], { type: "application/javascript" });
  export const workerScript = URL.createObjectURL(blob);