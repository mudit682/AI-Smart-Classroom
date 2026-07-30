import { Box, Button, Stack, Typography } from "@mui/material";

export function HomePage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          AI Smart Classroom
        </Typography>
        <Typography color="text.secondary">
          Project initialized. Core product workflows are ready to be designed.
        </Typography>
      </Box>
      <Button variant="contained" sx={{ alignSelf: "flex-start" }}>
        System Ready
      </Button>
    </Stack>
  );
}
