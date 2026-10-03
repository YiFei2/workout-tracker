import { useState } from "react";

import { NamePromptModal } from "./NamePromptModal";
import { PickerModal } from "./PickerModal";
import { useLocations } from "../hooks/useLocations";

interface Props {
  visible: boolean;
  title?: string;
  selectedId?: string | null;
  onSelect: (locationId: string) => void;
  onCancel: () => void;
}

const CREATE_NEW_ID = "__create_new__";

// Shared "choose a location" picker, used both to require a location before
// a workout session starts and to change a session's location afterward.
// Also covers the zero-locations case: if the user has none yet, the only
// item is "+ Add new location" — picking it creates one on the spot and
// immediately resolves as the selection, so there's never a dead end.
export function LocationPickerModal({
  visible,
  title = "Choose Location",
  selectedId = null,
  onSelect,
  onCancel,
}: Props) {
  const { locations, create } = useLocations();
  const [creating, setCreating] = useState(false);

  const handleSelect = (id: string) => {
    if (id === CREATE_NEW_ID) {
      setCreating(true);
      return;
    }
    onSelect(id);
  };

  const handleCreate = async (name: string) => {
    setCreating(false);
    const location = await create(name);
    onSelect(location.id);
  };

  return (
    <>
      <PickerModal
        visible={visible}
        title={title}
        items={[
          { id: CREATE_NEW_ID, label: "+ Add new location" },
          ...locations.map((location) => ({ id: location.id, label: location.name })),
        ]}
        selectedId={selectedId}
        onSelect={handleSelect}
        onCancel={onCancel}
      />
      <NamePromptModal
        visible={creating}
        title="New Location"
        submitLabel="Add"
        onCancel={() => setCreating(false)}
        onSubmit={handleCreate}
      />
    </>
  );
}
