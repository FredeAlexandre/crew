"use client";

import type * as React from "react";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

function AlertDialog(props: React.ComponentProps<typeof Dialog>) {
	return <Dialog role="alertdialog" showCloseButton={false} {...props} />;
}

export {
	AlertDialog,
	DialogClose as AlertDialogClose,
	DialogDescription as AlertDialogDescription,
	DialogFooter as AlertDialogFooter,
	DialogHeader as AlertDialogHeader,
	DialogTitle as AlertDialogTitle,
};
