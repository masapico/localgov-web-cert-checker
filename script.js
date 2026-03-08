// グローバル変数で現在のソート状態を管理
let currentSortColumn = -1;
let isAscending = true;

/**
 * JSONデータを読み込んでテーブルに表示する
 */
async function loadCertData() {
    const container = document.getElementById('data-container');
    
    try {
        // 同一ディレクトリのresult.jsonを取得
        const response = await fetch('result.json');
        const data = await response.json();
        
        const now = new Date();

        data.forEach(item => {
            const row = document.createElement('tr');
            
            const cert = item.certificate;
            // certificateが存在しない、またはerrorプロパティがある場合をエラーとする
            const hasError = !cert || cert.error;

            if (hasError) {
                const errorMsg = cert ? cert.error : 'データなし';
                row.innerHTML = `
                    <td>${item.pref}</td>
                    <td>${item.city}</td>
                    <td><a href="${item.url}" target="_blank" class="text-break">${item.url}</a></td>
                    <td data-value="0000-00-00T00:00:00">${errorMsg}</td>
                    <td><span class="badge bg-secondary">取得エラー</span></td>
                `;
            } else {
                const expireDate = new Date(cert.expires_iso);
                const dateString = expireDate.toLocaleString('ja-JP');
                
                // 有効期限までの残り日数を計算
                const diffTime = expireDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let statusBadge = '<span class="badge bg-success">有効</span>';
                
                if (diffTime < 0) {
                    row.classList.add('expired');
                    statusBadge = '<span class="badge bg-danger">期限切れ</span>';
                } else if (diffDays <= 30) {
                    row.classList.add('warning');
                    // 修正箇所：テンプレートリテラルで正しく変数展開
                    statusBadge = `<span class="badge bg-warning text-dark">残り${diffDays}日</span>`;
                }

                row.innerHTML = `
                    <td>${item.pref}</td>
                    <td>${item.city}</td>
                    <td><a href="${item.url}" target="_blank" class="text-break">${item.url}</a></td>
                    <td data-value="${cert.expires_iso}">${dateString}</td>
                    <td>${statusBadge}</td>
                `;
            }
            container.appendChild(row);
        });

    } catch (error) {
        console.error('データの読み込みに失敗しました:', error);
        container.innerHTML = '<tr><td colspan="5" class="text-center text-danger">JSONデータの読み込みに失敗しました。</td></tr>';
    }
}

/**
 * テーブルを指定した列でソートする
 */
function sortTable(columnIndex) {
    const tbody = document.getElementById("data-container");
    const rows = Array.from(tbody.querySelectorAll("tr"));

    // ソート方向の決定
    if (currentSortColumn === columnIndex) {
        isAscending = !isAscending;
    } else {
        isAscending = true;
        currentSortColumn = columnIndex;
    }

    const sortedRows = rows.sort((a, b) => {
        const aCol = a.children[columnIndex];
        const bCol = b.children[columnIndex];

        const aValue = aCol.getAttribute("data-value") || aCol.innerText.trim();
        const bValue = bCol.getAttribute("data-value") || bCol.innerText.trim();

        // 日付形式（ISO 8601など）としてパースを試みる
        const aDate = Date.parse(aValue);
        const bDate = Date.parse(bValue);

        // 両方が有効な日付であれば数値（ミリ秒）で比較
        if (!isNaN(aDate) && !isNaN(bDate)) {
            return isAscending ? aDate - bDate : bDate - aDate;
        }

        // 数値でない場合は日本語として文字列比較
        return isAscending 
            ? aValue.localeCompare(bValue, 'ja') 
            : bValue.localeCompare(aValue, 'ja');
    });

    // 表の更新
    tbody.append(...sortedRows);
}

// 実行
loadCertData();
