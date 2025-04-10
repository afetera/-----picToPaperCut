$(document).ready(function() {
    // 获取DOM元素
    const $imageUpload = $('#imageUpload');
    const $threshold = $('#threshold');
    const $thresholdValue = $('#thresholdValue');
    const $simplify = $('#simplify');
    const $simplifyValue = $('#simplifyValue');
    const $color = $('#color');
    const $convertBtn = $('#convertBtn');
    const $downloadBtn = $('#downloadBtn');
    const $message = $('#message');
    const originalCanvas = document.getElementById('originalCanvas');
    const paperCutCanvas = document.getElementById('paperCutCanvas');
    const originalCtx = originalCanvas.getContext('2d');
    const paperCutCtx = paperCutCanvas.getContext('2d');
    
    let originalImage = null;
    let paperCutImage = null;
    
    // 更新滑块值显示
    $threshold.on('input', function() {
        $thresholdValue.text($(this).val());
    });
    
    $simplify.on('input', function() {
        $simplifyValue.text($(this).val());
    });
    
    // 图片上传处理
    $imageUpload.on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            showMessage('请选择图片文件');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            originalImage = new Image();
            originalImage.onload = function() {
                // 设置画布尺寸
                setCanvasSize(originalCanvas, originalImage.width, originalImage.height);
                setCanvasSize(paperCutCanvas, originalImage.width, originalImage.height);
                
                // 绘制原始图片
                originalCtx.drawImage(originalImage, 0, 0);
                
                // 启用转换按钮
                $convertBtn.prop('disabled', false);
                $downloadBtn.prop('disabled', true);
                
                showMessage('图片已加载，可以开始转换');
            };
            originalImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
    
    // 转换按钮点击事件
    $convertBtn.on('click', function() {
        if (!originalImage) {
            showMessage('请先上传图片');
            return;
        }
        
        const threshold = parseInt($threshold.val());
        const simplifyLevel = parseInt($simplify.val());
        const paperCutColor = $color.val();
        
        // 转换为剪纸效果
        paperCutImage = convertToPaperCut(
            originalCanvas, 
            threshold, 
            simplifyLevel, 
            paperCutColor
        );
        
        // 绘制剪纸效果
        paperCutCtx.putImageData(paperCutImage, 0, 0);
        
        // 启用下载按钮
        $downloadBtn.prop('disabled', false);
        
        showMessage('转换完成！');
    });
    
    // 下载按钮点击事件
    $downloadBtn.on('click', function() {
        if (!paperCutImage) return;
        
        const link = document.createElement('a');
        link.download = 'papercut.png';
        link.href = paperCutCanvas.toDataURL('image/png');
        link.click();
    });
    
    // 设置画布尺寸
    function setCanvasSize(canvas, width, height) {
        // 限制最大尺寸为1800px
        const maxSize = 1800;
        let ratio = 1;
        
        if (width > height && width > maxSize) {
            ratio = maxSize / width;
        } else if (height > maxSize) {
            ratio = maxSize / height;
        }
        
        canvas.width = width * ratio;
        canvas.height = height * ratio;
    }
    
    // 转换为剪纸效果
    function convertToPaperCut(canvas, threshold, simplifyLevel, color) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // 获取图像数据
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // 1. 转换为灰度并应用阈值
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // 计算灰度值
            const gray = 0.3 * r + 0.59 * g + 0.11 * b;
            
            // 应用阈值
            const binary = gray > threshold ? 255 : 0;
            
            data[i] = data[i + 1] = data[i + 2] = binary;
        }
        
        // 2. 简化图像 (中值滤波)
        if (simplifyLevel > 0) {
            const tempData = new Uint8ClampedArray(data);
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const index = (y * width + x) * 4;
                    
                    // 统计周围像素
                    let blackCount = 0;
                    let totalCount = 0;
                    
                    for (let dy = -simplifyLevel; dy <= simplifyLevel; dy++) {
                        for (let dx = -simplifyLevel; dx <= simplifyLevel; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const nIndex = (ny * width + nx) * 4;
                                if (tempData[nIndex] === 0) blackCount++;
                                totalCount++;
                            }
                        }
                    }
                    
                    // 如果周围大多数像素是黑色，则设为黑色
                    const value = blackCount > totalCount / 2 ? 0 : 255;
                    data[index] = data[index + 1] = data[index + 2] = value;
                }
            }
        }
        
        // 3. 应用剪纸颜色
        const rgb = hexToRgb(color);
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] === 0) { // 黑色部分转为剪纸颜色
                data[i] = rgb.r;
                data[i + 1] = rgb.g;
                data[i + 2] = rgb.b;
            } else { // 白色部分保持不变
                data[i] = data[i + 1] = data[i + 2] = 255;
            }
        }
        
        return imageData;
    }
    
    // 十六进制颜色转RGB
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 0, b: 0 }; // 默认为红色
    }
    
    // 显示消息
    function showMessage(msg) {
        $message.text(msg);
    }
});