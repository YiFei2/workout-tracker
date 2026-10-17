import { fireEvent, render } from "@testing-library/react-native";

import { ExercisePickerModal } from "./ExercisePickerModal";
import type { Exercise } from "../types";

jest.mock("../contexts/ThemeContext", () => ({
  useTheme: () => ({ colors: require("../lib/theme").lightColors }),
}));

jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

// Jest hoists jest.mock factories above imports, so they can only close over
// variables named with a `mock` prefix (Jest's documented allowlist) —
// hence defining the fixture data here instead of importing it.
const mockLibraryExercises: Exercise[] = [
  { id: "e1", name: "Barbell Bench Press", createdAt: "", groupId: "g1" },
  { id: "e2", name: "Dumbbell Bench Press", createdAt: "", groupId: "g1" },
  { id: "e3", name: "Back Squat", createdAt: "", groupId: null },
];

jest.mock("../hooks/useExercises", () => ({
  useExercises: () => ({
    exercises: mockLibraryExercises,
    create: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe("ExercisePickerModal scoping", () => {
  it("browses the full library when no exercises override is given", async () => {
    const { getByText } = await render(
      <ExercisePickerModal visible onSelect={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(getByText("Barbell Bench Press")).toBeTruthy();
    expect(getByText("Back Squat")).toBeTruthy();
  });

  it("restricts the browsable list to the given exercises override, e.g. a group's members", async () => {
    const groupMembers = [mockLibraryExercises[0], mockLibraryExercises[1]];
    const { getByText, queryByText } = await render(
      <ExercisePickerModal visible exercises={groupMembers} onSelect={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(getByText("Barbell Bench Press")).toBeTruthy();
    expect(getByText("Dumbbell Bench Press")).toBeTruthy();
    expect(queryByText("Back Squat")).toBeNull();
  });

  it("filters the scoped list by search query", async () => {
    const groupMembers = [mockLibraryExercises[0], mockLibraryExercises[1]];
    const { getByPlaceholderText, getByText, queryByText } = await render(
      <ExercisePickerModal visible exercises={groupMembers} onSelect={jest.fn()} onCancel={jest.fn()} />,
    );
    await fireEvent.changeText(getByPlaceholderText("Search exercises…"), "dumbbell");
    expect(queryByText("Barbell Bench Press")).toBeNull();
    expect(getByText("Dumbbell Bench Press")).toBeTruthy();
  });

  it("offers to add a new exercise when nothing in the scoped list matches", async () => {
    const groupMembers = [mockLibraryExercises[0], mockLibraryExercises[1]];
    const { getByPlaceholderText, getByText } = await render(
      <ExercisePickerModal visible exercises={groupMembers} onSelect={jest.fn()} onCancel={jest.fn()} />,
    );
    await fireEvent.changeText(getByPlaceholderText("Search exercises…"), "Cable Fly");
    expect(getByText('+ Add "Cable Fly" as new exercise')).toBeTruthy();
  });
});
