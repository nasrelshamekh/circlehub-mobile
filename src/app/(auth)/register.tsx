import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
    AlertCircle,
    CalendarDays,
    Check,
    ChevronDown,
    Eye,
    EyeOff,
    LoaderCircle,
    MailCheck,
    UserPlus,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { resendVerification } from "@/api/auth";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import { ApiError } from "@/types/api";
import { themeColors } from "@/theme/colors";

type FieldErrors = {
    name?: string;
    username?: string;
    jobTitle?: string;
    gender?: string;
    dateOfBirth?: string;
    location?: string;
    email?: string;
    password?: string;
};

const GENDERS = [
    { label: "Select gender", value: "" },
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Other", value: "other" },
];

type PickerOption = {
    label: string;
    value: number;
};

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

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const COLUMN_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;

function pad2(value: number) {
    return String(value).padStart(2, "0");
}

// Shown in the form field (DD-MM-YYYY).
function formatDisplayDate(date: Date) {
    return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
}

// Sent to the API as an ISO date (YYYY-MM-DD).
function toApiDate(date: Date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

// A sensible starting point (~18 years ago) when nothing is chosen yet.
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
            initialScrollIndex={Math.max(0, Math.min(initialIndex, options.length - 1))}
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

export default function Register() {
    const { isDark } = useTheme();
    const { signUp } = useAuth();

    const colors = isDark ? themeColors.dark : themeColors.light;

    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [gender, setGender] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
    const [location, setLocation] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [genderPickerOpen, setGenderPickerOpen] = useState(false);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [draftDate, setDraftDate] = useState<Date>(() => defaultDateOfBirth());
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [registeredEmail, setRegisteredEmail] = useState("");
    const [resending, setResending] = useState(false);

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

    function validate() {
        const errors: FieldErrors = {};

        if (!name.trim()) {
            errors.name = "Full name is required";
        } else if (name.trim().length < 2) {
            errors.name = "Full name must be at least 2 characters";
        }

        const usernameTrimmed = username.trim();
        if (!usernameTrimmed) {
            errors.username = "Username is required";
        } else if (usernameTrimmed.length < 3 || usernameTrimmed.length > 30) {
            errors.username = "Username must be between 3 and 30 characters";
        } else if (!/^[a-zA-Z0-9_]+$/.test(usernameTrimmed)) {
            errors.username = "Username can only contain letters, numbers, and underscores";
        }

        if (!jobTitle.trim()) {
            errors.jobTitle = "Job title is required";
        } else if (jobTitle.trim().length < 2) {
            errors.jobTitle = "Job title must be at least 2 characters";
        }

        if (!gender) {
            errors.gender = "Please select a gender";
        } else if (gender !== "male" && gender !== "female" && gender !== "other") {
            errors.gender = "Gender is invalid";
        }

        if (!dateOfBirth) {
            errors.dateOfBirth = "Birthdate is required";
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (dateOfBirth > today) {
                errors.dateOfBirth = "Birthdate can't be in the future";
            }
        }

        if (!location.trim()) {
            errors.location = "Location is required";
        } else if (!/^[^,]+,\s*[^,]+$/.test(location.trim())) {
            errors.location = "Location must be in the format City, Country";
        }

        const emailTrimmed = email.trim();
        if (!emailTrimmed) {
            errors.email = "Email is required";
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailTrimmed)) {
                errors.email = "Email is invalid";
            }
        }

        if (!password) {
            errors.password = "Password is required";
        } else if (password.length < 8) {
            errors.password = "Password must be at least 8 characters";
        }

        setFieldErrors(errors);

        return Object.keys(errors).length === 0;
    }

    async function onSubmit() {
        if (submitting) {
            return;
        }

        setFormError(null);

        if (!validate()) {
            return;
        }

        if (!dateOfBirth) {
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                name: name.trim(),
                username: username.trim().toLowerCase(),
                jobTitle: jobTitle.trim(),
                gender: gender,
                dateOfBirth: toApiDate(dateOfBirth),
                location: location.trim(),
                email: email.trim().toLowerCase(),
                password,
            };

            const message = await signUp(payload);

            setRegisteredEmail(payload.email);
            setSuccessMessage(
                message || "Check your inbox to verify your email."
            );
        } catch (error) {
            setFormError(error instanceof ApiError ? error.message : "Could not create account");
        } finally {
            setSubmitting(false);
        }
    }

    // The account exists but is unverified, so we never route to the feed here.
    async function handleResend() {
        if (!registeredEmail || resending) {
            return;
        }

        setResending(true);

        try {
            const response = await resendVerification(registeredEmail);

            Alert.alert("Verification email sent", response.message);
        } catch (error) {
            Alert.alert(
                "Couldn't resend email",
                error instanceof ApiError
                    ? error.message
                    : "Please try again in a moment."
            );
        } finally {
            setResending(false);
        }
    }

    function openDatePicker() {
        setDraftDate(dateOfBirth ?? defaultDateOfBirth());
        setDatePickerOpen(true);
    }

    function closeDatePicker() {
        setDatePickerOpen(false);
    }

    function updateDraftDate(part: { day?: number; month?: number; year?: number }) {
        setDraftDate((previous) => {
            const year = part.year ?? previous.getFullYear();
            const month = part.month ?? previous.getMonth();
            const maxDay = daysInMonth(year, month);
            const day = Math.min(part.day ?? previous.getDate(), maxDay);

            return new Date(year, month, day);
        });
    }

    function confirmDatePicker() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const chosen = draftDate > today ? today : draftDate;

        setDateOfBirth(chosen);
        setFieldErrors((previous) => ({ ...previous, dateOfBirth: undefined }));
        setDatePickerOpen(false);
    }

    if (successMessage) {
        return (
            <SafeAreaView className="flex-1 bg-surface-low">
                <View className="flex-1 justify-center px-6">
                    <View className="w-full max-w-lg self-center items-center">
                        <View className="mb-6 h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
                            <MailCheck size={30} color={colors.primary} />
                        </View>

                        <Text className="text-center text-headline-md font-semibold text-text-primary">
                            Check your inbox
                        </Text>

                        <Text className="mt-3 text-center text-body-sm text-text-secondary">
                            {successMessage}
                        </Text>

                        {!!registeredEmail && (
                            <Text className="mt-1 text-center text-body-sm font-semibold text-text-primary">
                                {registeredEmail}
                            </Text>
                        )}

                        <Pressable
                            onPress={handleResend}
                            disabled={resending}
                            className="mt-8 w-full flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface-lowest px-5 py-4"
                            style={{ opacity: resending ? 0.6 : 1 }}
                        >
                            <Text className="text-body-md font-semibold text-text-primary">
                                {resending ? "Sending..." : "Resend email"}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() =>
                                router.replace({
                                    pathname: "/(auth)/login",
                                    params: { email: registeredEmail },
                                })
                            }
                            className="mt-4"
                        >
                            <Text className="text-body-sm font-semibold text-primary">
                                Back to sign in
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-surface-low">
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: "center",
                        padding: 24,
                    }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="w-full max-w-lg self-center">
                        <View className="mb-8 items-center">
                            <Image
                                source={require("@/assets/images/circlehub-logo.png")}
                                className="mb-8 h-16 w-[244px]"
                                resizeMode="contain"
                            />

                            <Text className="text-headline-md font-semibold text-text-primary">
                                Create your account
                            </Text>

                            <Text className="mt-2 text-body-sm text-text-secondary">
                                Join CircleHub and start building your network.
                            </Text>
                        </View>

                        <View className="gap-4">
                            <View className="gap-3">
                                <Text className="text-label-md font-semibold text-text-primary">
                                    Full Name
                                </Text>

                                <TextInput
                                    value={name}
                                    onChangeText={(value) => {
                                        setName(value);
                                        setFieldErrors((prev) => ({ ...prev, name: undefined }));
                                    }}
                                    placeholder="Your name"
                                    placeholderTextColor={colors.textSecondary}
                                    autoCapitalize="words"
                                    className={
                                        fieldErrors.name
                                            ? "rounded-xl border border-error bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                                            : "rounded-xl border border-border bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                                    }
                                />

                                {fieldErrors.name && (
                                    <Text className="flex-row items-center gap-1.5 text-label-sm text-error">
                                        {fieldErrors.name}
                                    </Text>
                                )}
                            </View>

                            <View className="gap-3">
                                <Text className="text-label-md font-semibold text-text-primary">
                                    Username
                                </Text>

                                <TextInput
                                    value={username}
                                    onChangeText={(value) => {
                                        setUsername(value);
                                        setFieldErrors((prev) => ({ ...prev, username: undefined }));
                                    }}
                                    placeholder="Choose a username"
                                    placeholderTextColor={colors.textSecondary}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    className={
                                        fieldErrors.username
                                            ? "rounded-xl border border-error bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                                            : "rounded-xl border border-border bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                                    }
                                />

                                {fieldErrors.username && (
                                    <Text className="flex-row items-center gap-1.5 text-label-sm text-error">
                                        {fieldErrors.username}
                                    </Text>
                                )}

                                <Text className="text-label-sm text-text-secondary">
                                    {"Your username can't be changed after you create your account."}
                                </Text>
                            </View>

                            <View className="gap-3">
                                <Text className="text-label-md font-semibold text-text-primary">
                                    Job Title
                                </Text>

                                <TextInput
                                    value={jobTitle}
                                    onChangeText={(value) => {
                                        setJobTitle(value);
                                        setFieldErrors((prev) => ({ ...prev, jobTitle: undefined }));
                                    }}
                                    placeholder="Your job title"
                                    placeholderTextColor={colors.textSecondary}
                                    className={
                                        fieldErrors.jobTitle
                                            ? "rounded-xl border border-error bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                                            : "rounded-xl border border-border bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                                    }
                                />

                                {fieldErrors.jobTitle && (
                                    <Text className="flex-row items-center gap-1.5 text-label-sm text-error">
                                        {fieldErrors.jobTitle}
                                    </Text>
                                )}
                            </View>

                            <View className="flex-row gap-4">
                                <View className="flex-1 gap-3">
                                    <Text className="text-label-md font-semibold text-text-primary">
                                        Gender
                                    </Text>

                                    <Pressable
                                        onPress={() => setGenderPickerOpen(true)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Select gender"
                                        className={
                                            fieldErrors.gender
                                                ? "flex-row items-center justify-between rounded-xl border border-error bg-surface-lowest px-4 py-3"
                                                : "flex-row items-center justify-between rounded-xl border border-border bg-surface-lowest px-4 py-3"
                                        }
                                    >
                                        <Text
                                            className={
                                                gender
                                                    ? "text-body-sm text-text-primary"
                                                    : "text-body-sm text-text-secondary"
                                            }
                                        >
                                            {gender
                                                ? GENDERS.find((g) => g.value === gender)?.label
                                                : "Select gender"}
                                        </Text>

                                        <ChevronDown
                                            size={18}
                                            color={colors.textSecondary}
                                        />
                                    </Pressable>

                                    {fieldErrors.gender && (
                                        <Text className="flex-row items-center gap-1.5 text-label-sm text-error">
                                            {fieldErrors.gender}
                                        </Text>
                                    )}
                                </View>

                                <View className="flex-1 gap-3">
                                    <Text className="text-label-md font-semibold text-text-primary">
                                        Birthdate
                                    </Text>

                                    <Pressable
                                        onPress={openDatePicker}
                                        accessibilityRole="button"
                                        accessibilityLabel="Select birthdate"
                                        className={
                                            fieldErrors.dateOfBirth
                                                ? "flex-row items-center justify-between rounded-xl border border-error bg-surface-lowest px-4 py-3"
                                                : "flex-row items-center justify-between rounded-xl border border-border bg-surface-lowest px-4 py-3"
                                        }
                                    >
                                        <Text
                                            className={
                                                dateOfBirth
                                                    ? "text-body-sm text-text-primary"
                                                    : "text-body-sm text-text-secondary"
                                            }
                                        >
                                            {dateOfBirth
                                                ? formatDisplayDate(dateOfBirth)
                                                : "DD-MM-YYYY"}
                                        </Text>

                                        <CalendarDays
                                            size={18}
                                            color={colors.textSecondary}
                                        />
                                    </Pressable>

                                    {fieldErrors.dateOfBirth && (
                                        <Text className="flex-row items-center gap-1.5 text-label-sm text-error">
                                            {fieldErrors.dateOfBirth}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            <View className="gap-3">
                                <Text className="text-label-md font-semibold text-text-primary">
                                    Location
                                </Text>

                                <TextInput
                                    value={location}
                                    onChangeText={(value) => {
                                        setLocation(value);
                                        setFieldErrors((prev) => ({ ...prev, location: undefined }));
                                    }}
                                    placeholder="City, Country"
                                    placeholderTextColor={colors.textSecondary}
                                    className={
                                        fieldErrors.location
                                            ? "rounded-xl border border-error bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                                            : "rounded-xl border border-border bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                                    }
                                />

                                {fieldErrors.location && (
                                    <Text className="flex-row items-center gap-1.5 text-label-sm text-error">
                                        {fieldErrors.location}
                                    </Text>
                                )}
                            </View>

                            <View className="gap-3">
                                <Text className="text-label-md font-semibold text-text-primary">
                                    Email
                                </Text>

                                <TextInput
                                    value={email}
                                    onChangeText={(value) => {
                                        setEmail(value);
                                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                                    }}
                                    placeholder="you@example.com"
                                    placeholderTextColor={colors.textSecondary}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="email-address"
                                    className={
                                        fieldErrors.email
                                            ? "rounded-xl border border-error bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                                            : "rounded-xl border border-border bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                                    }
                                />

                                {fieldErrors.email && (
                                    <Text className="flex-row items-center gap-1.5 text-label-sm text-error">
                                        {fieldErrors.email}
                                    </Text>
                                )}
                            </View>

                            <View className="gap-3">
                                <Text className="text-label-md font-semibold text-text-primary">
                                    Password
                                </Text>

                                <View
                                    className={
                                        fieldErrors.password
                                            ? "flex-row items-center rounded-xl border border-error bg-surface-lowest px-4"
                                            : "flex-row items-center rounded-xl border border-border bg-surface-lowest px-4"
                                    }
                                >
                                    <TextInput
                                        value={password}
                                        onChangeText={(value) => {
                                            setPassword(value);
                                            setFieldErrors((prev) => ({ ...prev, password: undefined }));
                                        }}
                                        placeholder="Create a password"
                                        placeholderTextColor={colors.textSecondary}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoComplete="password"
                                        className="min-w-0 flex-1 py-3 text-body-sm text-text-primary"
                                    />

                                    <Pressable
                                        onPress={() => setShowPassword((current) => !current)}
                                        className="ml-3 shrink-0"
                                        accessibilityLabel={
                                            showPassword ? "Hide password" : "Show password"
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff size={18} color={colors.textSecondary} />
                                        ) : (
                                            <Eye size={18} color={colors.textSecondary} />
                                        )}
                                    </Pressable>
                                </View>

                                {fieldErrors.password && (
                                    <Text className="flex-row items-center gap-1.5 text-label-sm text-error">
                                        {fieldErrors.password}
                                    </Text>
                                )}
                            </View>

                            {formError && (
                                <View className="flex-row items-center gap-1.5 rounded-xl bg-error-container px-4 py-3">
                                    <AlertCircle
                                        size={16}
                                        color={isDark ? "#ffb4ab" : "#ba1a1a"}
                                    />

                                    <Text className="flex-1 text-label-sm text-error">
                                        {formError}
                                    </Text>
                                </View>
                            )}

                            <Pressable
                                onPress={onSubmit}
                                disabled={submitting}
                                className="overflow-hidden rounded-xl"
                            >
                                <LinearGradient
                                    colors={[
                                        colors.primaryGradientStart,
                                        colors.primaryGradientEnd,
                                    ]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 8,
                                        paddingHorizontal: 20,
                                        paddingVertical: 16,
                                        opacity: submitting ? 0.6 : 1,
                                    }}
                                >
                                    {submitting ? (
                                        <LoaderCircle
                                            size={18}
                                            color={colors.buttonGradientText}
                                        />
                                    ) : (
                                        <UserPlus
                                            size={18}
                                            color={colors.buttonGradientText}
                                        />
                                    )}

                                    <Text
                                        className="text-body-md font-semibold"
                                        style={{
                                            color: colors.buttonGradientText,
                                        }}
                                    >
                                        {submitting ? "Creating Account..." : "Create Account"}
                                    </Text>
                                </LinearGradient>
                            </Pressable>
                        </View>

                        <Text className="mt-6 text-center text-body-sm text-text-secondary">
                            Already have an account?{" "}
                            <Text
                                className="font-semibold text-primary"
                                onPress={() => router.push("/(auth)/login")}
                            >
                                Sign in
                            </Text>
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal
                visible={genderPickerOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setGenderPickerOpen(false)}
            >
                <Pressable
                    className="flex-1 justify-center px-6"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}
                    onPress={() => setGenderPickerOpen(false)}
                >
                    <View className="w-full max-w-lg self-center overflow-hidden rounded-2xl bg-surface-lowest py-2">
                        {GENDERS.filter((option) => option.value !== "").map((option) => (
                            <Pressable
                                key={option.value}
                                onPress={() => {
                                    setGender(option.value);
                                    setGenderPickerOpen(false);
                                    setFieldErrors((prev) => ({
                                        ...prev,
                                        gender: undefined,
                                    }));
                                }}
                                className="flex-row items-center justify-between px-5 py-4"
                            >
                                <Text className="text-body-md text-text-primary">
                                    {option.label}
                                </Text>

                                {gender === option.value && (
                                    <Check size={18} color={colors.primary} />
                                )}
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>

            {datePickerOpen && (
                <Modal
                    visible
                    transparent
                    animationType="fade"
                    onRequestClose={closeDatePicker}
                >
                    <Pressable
                        className="flex-1 justify-center px-6"
                        style={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}
                        onPress={closeDatePicker}
                    >
                        <View className="w-full max-w-lg self-center overflow-hidden rounded-2xl bg-surface-lowest">
                            <View className="flex-row items-center justify-between border-b border-border px-5 py-4">
                                <Pressable onPress={closeDatePicker}>
                                    <Text className="text-body-sm font-semibold text-text-secondary">
                                        Cancel
                                    </Text>
                                </Pressable>

                                <Text className="text-label-md font-semibold text-text-primary">
                                    Date of birth
                                </Text>

                                <Pressable onPress={confirmDatePicker}>
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
            )}
        </SafeAreaView>
    );
}