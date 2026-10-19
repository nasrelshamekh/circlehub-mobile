import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const COLUMN_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

type PickerOption = {
    label: string;
    value: number;
};

export type DatePickerProps = {
    value: Date | null;
    maximumDate?: Date;
    onConfirm: (date: Date) => void;
    onClose: () => void;
};

function pad2(value: number) {
    return String(value).padStart(2, "0");
}

export function formatDisplayDate(date: Date) {
    return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
}

export function toApiDate(date: Date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function defaultDateOfBirth() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setFullYear(date.getFullYear() - 18);
    return date;
}

function PickerColumn({
    options,
    selectedValue,
    initialIndex,
    onSelect,
}: {
    options: PickerOption[];
    selectedValue: number;
    initialIndex: number;
    onSelect: (value: number) => void;
}) {
    return (
        <FlatList
            data={options}
            keyExtractor={(item) => String(item.value)}
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, index) => ({
                length: ITEM_HEIGHT,
                offset: ITEM_HEIGHT * index,
                index,
            })}
            initialScrollIndex={Math.max(
                0,
                Math.min(initialIndex, options.length - 1)
            )}
            contentContainerStyle={{
                paddingVertical: (COLUMN_HEIGHT - ITEM_HEIGHT) / 2,
            }}
            style={{ height: COLUMN_HEIGHT }}
            renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;

                return (
                    <Pressable
                        onPress={() => onSelect(item.value)}
                        style={{ height: ITEM_HEIGHT }}
                        className="items-center justify-center"
                    >
                        <Text
                            className={
                                isSelected
                                    ? "text-body-md font-semibold text-primary"
                                    : "text-body-md text-text-secondary"
                            }
                        >
                            {item.label}
                        </Text>
                    </Pressable>
                );
            }}
        />
    );
}

export default function DatePicker({
    value,
    maximumDate,
    onConfirm,
    onClose,
}: DatePickerProps) {
    const [draftDate, setDraftDate] = useState<Date>(
        () => value ?? defaultDateOfBirth()
    );

    const draftDayCount = daysInMonth(draftDate.getFullYear(), draftDate.getMonth());
    const dayOptions = useMemo(
        () =>
            Array.from({ length: draftDayCount }, (_, index) => ({
                label: String(index + 1),
                value: index + 1,
            })),
        [draftDayCount]
    );
    const monthOptions = useMemo(
        () => MONTH_NAMES.map((label, value) => ({ label, value })),
        []
    );
    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();

        return Array.from({ length: 101 }, (_, index) => {
            const year = currentYear - index;

            return { label: String(year), value: year };
        });
    }, []);

    function updateDraftDate(part: {
        day?: number;
        month?: number;
        year?: number;
    }) {
        setDraftDate((previous) => {
            const year = part.year ?? previous.getFullYear();
            const month = part.month ?? previous.getMonth();
            const maxDay = daysInMonth(year, month);
            const day = Math.min(part.day ?? previous.getDate(), maxDay);

            return new Date(year, month, day);
        });
    }

    function confirm() {
        const max = maximumDate ?? new Date();
        onConfirm(draftDate > max ? max : draftDate);
    }

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Pressable
                className="flex-1 justify-center px-6"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}
                onPress={onClose}
            >
                <View className="w-full max-w-lg self-center overflow-hidden rounded-2xl bg-surface-lowest">
                    <View className="flex-row items-center justify-between border-b border-border px-5 py-4">
                        <Pressable onPress={onClose}>
                            <Text className="text-body-sm font-semibold text-text-secondary">
                                Cancel
                            </Text>
                        </Pressable>

                        <Text className="text-label-md font-semibold text-text-primary">
                            Date of birth
                        </Text>

                        <Pressable onPress={confirm}>
                            <Text className="text-body-sm font-semibold text-primary">
                                Done
                            </Text>
                        </Pressable>
                    </View>

                    <View className="flex-row px-2 py-3">
                        <View className="flex-1">
                            <PickerColumn
                                options={dayOptions}
                                selectedValue={draftDate.getDate()}
                                initialIndex={draftDate.getDate() - 1}
                                onSelect={(day) => updateDraftDate({ day })}
                            />
                        </View>

                        <View style={{ flex: 1.4 }}>
                            <PickerColumn
                                options={monthOptions}
                                selectedValue={draftDate.getMonth()}
                                initialIndex={draftDate.getMonth()}
                                onSelect={(month) => updateDraftDate({ month })}
                            />
                        </View>

                        <View className="flex-1">
                            <PickerColumn
                                options={yearOptions}
                                selectedValue={draftDate.getFullYear()}
                                initialIndex={
                                    new Date().getFullYear() -
                                    draftDate.getFullYear()
                                }
                                onSelect={(year) => updateDraftDate({ year })}
                            />
                        </View>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}
