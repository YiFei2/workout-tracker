import { fireEvent, render } from "@testing-library/react-native";

import { GroupPickerModal } from "./GroupPickerModal";
import type { ExerciseGroup } from "../types";

jest.mock("../contexts/ThemeContext", () => ({
  useTheme: () => ({ colors: require("../lib/theme").lightColors }),
}));

jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

const mockCreateExerciseGroup = jest.fn();
jest.mock("../db", () => ({
  createExerciseGroup: (name: string) => mockCreateExerciseGroup(name),
}));

const groups: ExerciseGroup[] = [
  { id: "g1", name: "Chest+Press+Variants", createdAt: "", members: [] },
  { id: "g2", name: "Leg compound", createdAt: "", members: [] },
];

beforeEach(() => {
  mockCreateExerciseGroup.mockReset();
});

describe("GroupPickerModal", () => {
  it("lists all groups with no search query", async () => {
    const { getByText } = await render(
      <GroupPickerModal visible groups={groups} onSelect={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(getByText("Chest+Press+Variants")).toBeTruthy();
    expect(getByText("Leg compound")).toBeTruthy();
  });

  it("filters groups by search query, case-insensitively", async () => {
    const { getByPlaceholderText, queryByText, getByText } = await render(
      <GroupPickerModal visible groups={groups} onSelect={jest.fn()} onCancel={jest.fn()} />,
    );
    await fireEvent.changeText(getByPlaceholderText("Search groups…"), "leg");
    expect(queryByText("Chest+Press+Variants")).toBeNull();
    expect(getByText("Leg compound")).toBeTruthy();
  });

  it("does not offer to create a group when the query exactly matches an existing one", async () => {
    const { getByPlaceholderText, queryByText } = await render(
      <GroupPickerModal visible groups={groups} onSelect={jest.fn()} onCancel={jest.fn()} />,
    );
    await fireEvent.changeText(getByPlaceholderText("Search groups…"), "Leg compound");
    expect(queryByText(/Create group/)).toBeNull();
  });

  it("offers to create a new group when the query matches nothing", async () => {
    const { getByPlaceholderText, getByText } = await render(
      <GroupPickerModal visible groups={groups} onSelect={jest.fn()} onCancel={jest.fn()} />,
    );
    await fireEvent.changeText(getByPlaceholderText("Search groups…"), "Back Compound");
    expect(getByText('+ Create group "Back Compound" and link it')).toBeTruthy();
  });

  it("creates the group and selects it when the create row is pressed", async () => {
    const newGroup: ExerciseGroup = { id: "g3", name: "Back Compound", createdAt: "", members: [] };
    mockCreateExerciseGroup.mockResolvedValue(newGroup);
    const onSelect = jest.fn();

    const { getByPlaceholderText, getByText } = await render(
      <GroupPickerModal visible groups={groups} onSelect={onSelect} onCancel={jest.fn()} />,
    );
    await fireEvent.changeText(getByPlaceholderText("Search groups…"), "Back Compound");
    await fireEvent.press(getByText('+ Create group "Back Compound" and link it'));

    expect(mockCreateExerciseGroup).toHaveBeenCalledWith("Back Compound");
    expect(onSelect).toHaveBeenCalledWith(newGroup);
  });

  it("calls onSelect with the existing group when a row is pressed", async () => {
    const onSelect = jest.fn();
    const { getByText } = await render(
      <GroupPickerModal visible groups={groups} onSelect={onSelect} onCancel={jest.fn()} />,
    );
    await fireEvent.press(getByText("Leg compound"));
    expect(onSelect).toHaveBeenCalledWith(groups[1]);
  });
});
