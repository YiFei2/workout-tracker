import { fireEvent, render } from "@testing-library/react-native";

import { SetRow } from "./SetRow";

jest.mock("../contexts/ThemeContext", () => ({
  useTheme: () => ({ colors: require("../lib/theme").lightColors }),
}));

jest.mock("../contexts/UnitContext", () => ({
  useWeightUnit: () => ({ unit: "kg" }),
}));

describe("SetRow select-all-on-focus", () => {
  it("selects the full existing value when the reps field is focused", async () => {
    const { getByTestId } = await render(
      <SetRow index={0} reps={12} weight={60} onUpdate={jest.fn()} onRemove={jest.fn()} />,
    );
    const repsInput = getByTestId("set-row-reps-input");

    expect(repsInput.props.selection).toBeUndefined();
    await fireEvent(repsInput, "focus");
    expect(repsInput.props.selection).toEqual({ start: 0, end: "12".length });
  });

  it("selects the full existing value when the weight field is focused", async () => {
    const { getByTestId } = await render(
      <SetRow index={0} reps={12} weight={60} onUpdate={jest.fn()} onRemove={jest.fn()} />,
    );
    const weightInput = getByTestId("set-row-weight-input");

    await fireEvent(weightInput, "focus");
    expect(weightInput.props.selection).toEqual({ start: 0, end: "60".length });
  });

  it("clears the selection once the user starts typing, so new keystrokes don't re-select", async () => {
    const { getByTestId } = await render(
      <SetRow index={0} reps={12} weight={60} onUpdate={jest.fn()} onRemove={jest.fn()} />,
    );
    const repsInput = getByTestId("set-row-reps-input");

    await fireEvent(repsInput, "focus");
    await fireEvent(repsInput, "changeText", "5");
    expect(repsInput.props.selection).toBeUndefined();
  });

  it("leaves the value unchanged if the field is focused and blurred without edits", async () => {
    const onUpdate = jest.fn();
    const { getByTestId } = await render(
      <SetRow index={0} reps={12} weight={60} onUpdate={onUpdate} onRemove={jest.fn()} />,
    );
    const repsInput = getByTestId("set-row-reps-input");

    await fireEvent(repsInput, "focus");
    await fireEvent(repsInput, "endEditing");

    expect(onUpdate).toHaveBeenCalledWith({ reps: 12 });
  });

  it("does not render set inputs in read-only mode", async () => {
    const { queryByTestId } = await render(
      <SetRow index={0} reps={12} weight={60} readOnly onUpdate={jest.fn()} onRemove={jest.fn()} />,
    );
    expect(queryByTestId("set-row-reps-input")).toBeNull();
    expect(queryByTestId("set-row-weight-input")).toBeNull();
  });
});
