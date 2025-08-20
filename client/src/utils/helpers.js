export const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  let hue = Math.abs(hash) % 360,
    sat = 30,
    light = 55;
  const hslToHex = (h, s, l) => {
    s /= 100;
    l /= 100;
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      return Math.round(
        255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))),
      );
    };
    return `#${[f(0), f(8), f(4)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')}`;
  };
  const contrast = (hex) => {
    const [r, g, b] = hex
      .match(/\w\w/g)
      .map((x) => parseInt(x, 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
  };
  let hex = hslToHex(hue, sat, light);
  while (contrast(hex) < 4.5 && light > 25)
    hex = hslToHex(hue, sat, (light -= 2));
  return hex;
};

export const toTitleCase = (str) =>
  str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
