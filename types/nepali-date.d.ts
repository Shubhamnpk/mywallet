declare module 'nepali-date-converter' {
    export default class NepaliDate {
        constructor();
        constructor(date: Date);
        constructor(year: number, month: number, date: number);
        constructor(dateString: string);
        getYear(): number;
        getMonth(): number;
        getDate(): number;
        getDay(): number;
        toJsDate(): Date;
        format(formatStr: string): string;
        static parse(dateString: string): NepaliDate;
    }
}
