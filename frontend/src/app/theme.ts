import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#5364e8"
    },
    secondary: {
      main: "#12805c"
    },
    background: {
      default: "#f4f6fb",
      paper: "#ffffff"
    }
  },
  shape: {
    borderRadius: 8
  },
  typography: {
    fontFamily: ["Inter", "Roboto", "Arial", "sans-serif"].join(",")
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 7, fontWeight: 700, textTransform: "none" }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 8 }
      }
    }
  }
});

