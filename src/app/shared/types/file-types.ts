export const FileTypes = {
  Image: '1',
  File: '2',
  Excel: '3',
} as const;

export type FileTypes = (typeof FileTypes)[keyof typeof FileTypes];

// 💡 How it works
// as const → makes all properties readonly and preserves literal values.
// typeof FileTypes → gets the type of the object.
// keyof typeof FileTypes → gets all keys ("Image" | "File" | "Excel").
// typeof FileTypes[keyof typeof FileTypes] → extracts the values ('1' | '2' | '3').
