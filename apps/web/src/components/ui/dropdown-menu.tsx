"use client";

import { cva } from "class-variance-authority";
import { ChevronRightIcon } from "lucide-react";
import type * as React from "react";
import {
	Header as HeaderPrimitive,
	MenuItem as MenuItemPrimitive,
	type MenuItemProps as MenuItemPrimitiveProps,
	Menu as MenuPrimitive,
	MenuSection as MenuSectionPrimitive,
	type MenuSectionProps as MenuSectionPrimitiveProps,
	MenuTrigger as MenuTriggerPrimitive,
	OverlayArrow as OverlayArrowPrimitive,
	Popover as PopoverPrimitive,
	Separator as SeparatorPrimitive,
	SubmenuTrigger as SubmenuTriggerPrimitive,
} from "react-aria-components";

import { cn } from "@/lib/utils";

function DropdownMenuTrigger({ ...props }: React.ComponentProps<typeof MenuTriggerPrimitive>) {
	return <MenuTriggerPrimitive data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenu({
	"data-slot": dataSlot = "dropdown-menu-content",
	placement = "bottom",
	offset = 8,
	crossOffset = 0,
	className,
	children,
	showArrow = false,
	...props
}: Omit<React.ComponentProps<typeof MenuPrimitive>, "className" | "children"> & {
	placement?: React.ComponentProps<typeof PopoverPrimitive>["placement"];
	offset?: number;
	crossOffset?: number;
	"data-slot"?: string;
	className?: string;
	children?: React.ReactNode;
	showArrow?: boolean;
}) {
	return (
		<PopoverPrimitive
			data-slot={dataSlot}
			placement={placement}
			offset={offset}
			crossOffset={crossOffset}
			className={cn(
				"z-50 min-w-32 origin-(--trigger-anchor-point) overflow-visible rounded-xl bg-popover/95 p-1 text-popover-foreground shadow-xl ring-1 ring-foreground/15 outline-none backdrop-blur-md duration-200 data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:fade-out-0 data-exiting:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2",
				className,
			)}
		>
			{showArrow ? (
				<OverlayArrowPrimitive className="group">
					<svg
						width={12}
						height={12}
						viewBox="0 0 12 12"
						aria-hidden="true"
						className="block fill-popover stroke-foreground/10 group-data-[placement=left]:rotate-90 group-data-[placement=right]:-rotate-90 group-data-[placement=top]:rotate-180"
					>
						<path d="M0 6 L6 0 L12 6" />
					</svg>
				</OverlayArrowPrimitive>
			) : null}
			<MenuPrimitive
				className="max-h-[inherit] overflow-x-hidden overflow-y-auto outline-hidden"
				{...props}
			>
				{children}
			</MenuPrimitive>
		</PopoverPrimitive>
	);
}

function DropdownMenuGroup<T extends object>({
	...props
}: Omit<MenuSectionPrimitiveProps<T>, "children"> & {
	children?: React.ReactNode;
}) {
	return <MenuSectionPrimitive data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuLabel({
	className,
	inset,
	...props
}: React.ComponentProps<typeof HeaderPrimitive> & {
	inset?: boolean;
}) {
	return (
		<HeaderPrimitive
			data-slot="dropdown-menu-label"
			data-inset={inset}
			className={cn(
				"px-2 py-1.5 text-xs font-medium text-muted-foreground data-inset:pl-8",
				className,
			)}
			{...props}
		/>
	);
}

const dropdownMenuItemVariants = cva(
	"group/dropdown-menu-item relative flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-8 focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
);

function DropdownMenuItem({
	className,
	inset,
	variant = "default",
	children,
	...props
}: MenuItemPrimitiveProps & {
	inset?: boolean;
	variant?: "default" | "destructive";
}) {
	return (
		<MenuItemPrimitive
			data-slot="dropdown-menu-item"
			data-inset={inset}
			data-variant={variant}
			textValue={typeof children === "string" ? children : props.textValue}
			className={cn(dropdownMenuItemVariants(), className)}
			{...props}
		>
			{children}
		</MenuItemPrimitive>
	);
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof SubmenuTriggerPrimitive>) {
	return <SubmenuTriggerPrimitive data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
	className,
	inset,
	children,
	...props
}: MenuItemPrimitiveProps & {
	inset?: boolean;
}) {
	return (
		<MenuItemPrimitive
			data-slot="dropdown-menu-sub-trigger"
			data-inset={inset}
			textValue={typeof children === "string" ? children : props.textValue}
			className={cn(
				"flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-8 data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		>
			{children}
			<ChevronRightIcon className="ml-auto size-4" />
		</MenuItemPrimitive>
	);
}

function DropdownMenuSeparator({
	className,
	...props
}: React.ComponentProps<typeof SeparatorPrimitive>) {
	return (
		<SeparatorPrimitive
			data-slot="dropdown-menu-separator"
			className={cn("-mx-1 my-1 h-px bg-border", className)}
			{...props}
		/>
	);
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="dropdown-menu-shortcut"
			className={cn(
				"ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export {
	DropdownMenu,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
};
