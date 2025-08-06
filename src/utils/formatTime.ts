export const formatTime = (seconds: number): string => {
    if (!seconds || seconds === 0) return '0분';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes === 0) return `${remainingSeconds}초`;
    if (remainingSeconds === 0) return `${minutes}분`;
    return `${minutes}분 ${remainingSeconds}초`;
};