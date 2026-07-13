_**yet Another react-eyedropper**_ (ya-react-eyedropper)

A fully controlled simple react component around [eyedropper-polyfill](https://github.com/iam-medvedev/eyedropper-polyfill).

Installation:

```
npm install ya-react-eyedropper --save
```

### [Demo](https://stackblitz.com/edit/vitejs-vite-2awgpp?file=src%2FApp.tsx)

### Props:

_on: boolean_  
--enables the eyedropper

_onPick: (color: Color) => unknown_  
-- returns color object. currently only supports hex.

_onPickCancel: () => unknown_  
-- called when eyedropper gets cancelled by clicking esc. similar to native eyedropper of chrome.

_**Note:**_ Cancel the eyedropper by clicking on keyboard escape button.

### Usage

```
import { useState } from "react";
import { Color, EyeDropper } from "ya-react-eyedropper";

const App = () => {
  const [on, setOn] = useState(false);
  const onPick = (color: Color) => {
    setOn(false);
    console.log({ hex: color.hex });
  };

  const onPickCancel = () => {
    setOn(false);
  };

  return (
    <EyeDropper onPick={onPick} on={on} onPickCancel={onPickCancel}>
      <button onClick={() => setOn(true)}>click me</button>
    </EyeDropper>
  );
};

export default App;
```

### Licence

[MIT](https://github.com/mohamediburan/ya-react-eyedropper/blob/main/LICENSE)
