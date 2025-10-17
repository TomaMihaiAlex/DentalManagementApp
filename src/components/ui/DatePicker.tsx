import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { ro } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';

interface DatePickerProps {
    date: Date | undefined;
    setDate: ((date: Date | undefined) => void) | undefined;
    disabled?: boolean;
}

export function DatePicker({ date, setDate, disabled = false }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal dark:text-white',
            !date && 'text-gray-500 dark:text-gray-400'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'dd/MM/yyyy', { locale: ro }) : <span className="text-gray-500 dark:text-gray-50">Alege o dată</span>}
        </Button>
      </PopoverTrigger>
      {!disabled && (
        <PopoverContent className="w-auto p-0">
            <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            locale={ro}
            />
        </PopoverContent>
      )}
    </Popover>
  );
}
