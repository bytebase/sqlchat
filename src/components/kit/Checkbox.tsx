import * as CheckboxUI from "@radix-ui/react-checkbox";
import { CheckIcon, DividerHorizontalIcon } from "@radix-ui/react-icons";
import { useState } from "react";

interface CheckboxProps {
  value: boolean;
  label: string;
  token: number;
  onValueChange: (tableName: string, value: boolean) => void;
}
const Checkbox = (props: CheckboxProps) => {
  const { value, label, token, onValueChange } = props;
  return (
    <form>
      <div className=" px-3 py-2 flex justify-between items-center	">
        <CheckboxUI.Root
          checked={value}
          onCheckedChange={(value: boolean) => onValueChange(label, value)}
          className="bg-white w-5 h-5 shrink-0 cursor-pointer rounded-sm flex border border-gray-300 hover:border-black m-auto"
          id={label}
        >
          <CheckboxUI.Indicator className="m-auto text-black 	">
            <CheckIcon />
          </CheckboxUI.Indicator>
        </CheckboxUI.Root>
        <label className="Label  grow m-auto px-3 py-2 cursor-pointer truncate text-black dark:text-gray-300 " htmlFor={label}>
          {label}
        </label>
        <div className="text-black dark:text-gray-300">{token}</div>
      </div>
    </form>
  );
};

export default Checkbox;