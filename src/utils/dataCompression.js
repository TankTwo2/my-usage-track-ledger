// 데이터 압축/해제 함수들
export const compressData = (data) => {
    try {
        return btoa(JSON.stringify(data));
    } catch (error) {
        console.error('데이터 압축 오류:', error);
        return null;
    }
};

export const decompressData = (compressedData) => {
    try {
        return JSON.parse(atob(compressedData));
    } catch (error) {
        console.error('데이터 해제 오류:', error);
        return null;
    }
};

export const loadDataFromURL = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');

    if (dataParam) {
        const decompressed = decompressData(dataParam);
        if (decompressed) {
            return decompressed;
        }
    }
    return null;
};

export const saveDataToURL = (data) => {
    const compressed = compressData(data);
    if (compressed) {
        const newURL = `${window.location.origin}${window.location.pathname}?data=${compressed}`;
        window.history.pushState({}, '', newURL);
        return newURL;
    }
    return null;
};
