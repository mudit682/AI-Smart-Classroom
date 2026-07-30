import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1f6feb"
    },
    secondary: {
      main: "#12805c"
    },
    background: {
      default: "#f7f8fa"
    }
  },
  shape: {
    borderRadius: 8
  },
  typography: {
    fontFamily: ["Inter", "Roboto", "Arial", "sans-serif"].join(",")
  }
});

