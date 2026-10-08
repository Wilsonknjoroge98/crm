import { Box } from '@mui/material';
import { useState, useEffect } from 'react';

export default function QtyInput({ value, max, onChange, sx }) {
  const [local, setLocal] = useState(String(value));

  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  const commit = (raw) => {
    const digits = String(raw).replace(/[^0-9]/g, '');
    let n = parseInt(digits, 10);
    if (isNaN(n) || n < 0) n = 0;
    if (n > max) n = max;
    setLocal(String(n));
    if (n !== value) onChange(n);
  };

  return (
    <Box
      component='input'
      type='text'
      inputMode='numeric'
      value={local}
      onChange={(e) => setLocal(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={(e) => commit(e.target.value)}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      sx={{
        textAlign: 'center',
        fontWeight: 700,
        border: 'none',
        outline: 'none',
        bgcolor: 'transparent',
        p: 0,
        m: 0,
        fontFamily: 'inherit',
        '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
          WebkitAppearance: 'none',
          m: 0,
        },
        ...sx,
      }}
    />
  );
}
