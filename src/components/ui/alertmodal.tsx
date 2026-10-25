import { ReactNode } from "react";

import ConfirmModal from "@/components/ui/confirmmodal";

export type AlertModalProps = {
    visible: boolean;
    title: string;
    message?: string;
    buttonText?: string;
    destructive?: boolean;
    icon?: ReactNode;
    onClose: () => void;
};

export default function AlertModal({
    visible,
    title,
    message,
    buttonText = "OK",
    destructive = false,
    icon,
    onClose,
}: AlertModalProps) {
    return (
        <ConfirmModal
            visible={visible}
            title={title}
            message={message}
            showCancel={false}
            confirmText={buttonText}
            destructive={destructive}
            icon={icon}
            onCancel={onClose}
            onConfirm={onClose}
        />
    );
}
