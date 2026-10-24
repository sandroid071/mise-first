import { Stack } from "expo-router";
export default function Layout() { return <Stack screenOptions={{ headerStyle: { backgroundColor: "#2B1E16" }, headerTintColor: "#FFF8EC" }}><Stack.Screen name="index" options={{ title: "The Pass" }} /></Stack>; }
