#\!/usr/bin/env python3
"""
macOS 트레이 아이콘용 투명 배경 흰색 T 생성
16x16 픽셀, Template 이미지 스타일
"""

# PNG 헤더와 데이터를 직접 생성
def create_t_icon():
    import struct
    import zlib
    
    width, height = 16, 16
    
    # RGBA 픽셀 데이터 생성 (모두 투명)
    pixels = []
    for y in range(height):
        row = []
        for x in range(width):
            # 기본적으로 투명
            r, g, b, a = 0, 0, 0, 0
            
            # T 모양 그리기 (흰색, 불투명)
            # 상단 가로줄: y=3,4에서 x=2~13
            if y in [3, 4] and 2 <= x <= 13:
                r, g, b, a = 255, 255, 255, 255
            # 세로줄: x=7,8에서 y=4~13
            elif x in [7, 8] and 4 <= y <= 13:
                r, g, b, a = 255, 255, 255, 255
            
            row.extend([r, g, b, a])
        pixels.extend([0] + row)  # PNG 필터 타입 0 추가
    
    # PNG 데이터 압축
    compressor = zlib.compressobj()
    png_data = compressor.compress(bytes(pixels))
    png_data += compressor.flush()
    
    # PNG 파일 구조 생성
    def crc(data):
        return struct.pack('>I', zlib.crc32(data) & 0xffffffff)
    
    # PNG 시그니처
    png = b'\x89PNG\r\n\x1a\n'
    
    # IHDR 청크
    ihdr = struct.pack('>2I5B', width, height, 8, 6, 0, 0, 0)
    png += struct.pack('>I', 13) + b'IHDR' + ihdr + crc(b'IHDR' + ihdr)
    
    # IDAT 청크
    png += struct.pack('>I', len(png_data)) + b'IDAT' + png_data + crc(b'IDAT' + png_data)
    
    # IEND 청크
    png += struct.pack('>I', 0) + b'IEND' + crc(b'IEND')
    
    return png

# 아이콘 생성 및 저장
if __name__ == '__main__':
    try:
        icon_data = create_t_icon()
        with open('assets/perfect-t-icon.png', 'wb') as f:
            f.write(icon_data)
        print('✅ Perfect T icon created: assets/perfect-t-icon.png')
    except Exception as e:
        print(f'❌ Error: {e}')
