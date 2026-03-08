// グローバル変数で現在のソート状態を管理
let currentSortColumn = -1;
let isAscending = true;

/**
 * 最終更新日時を読み込んで表示する
 */
async function loadLastUpdated() {
    try {
        const response = await fetch('updated.txt');
        if (response.ok) {
            const lastUpdated = await response.text();
            const lastUpdatedElement = document.getElementById('last-updated');
            if (lastUpdatedElement) {
                lastUpdatedElement.textContent = `最終更新: ${lastUpdated}`;
            }
        }
    } catch (error) {
        console.error('最終更新日時の読み込みに失敗しました:', error);
    }
}
/**
 * JSONデータを読み込んでテーブルに表示する
 */
async function loadCertData() {
    const container = document.getElementById('data-container');
    
    try {
        // 同一ディレクトリのresult.jsonを取得
        const response = await fetch('result.json');
        const data = await response.json();
        
        data.forEach(item => {
            const row = document.createElement('tr');
            
            const cert = item.certificate;
            const status = item.status;

            let statusBadgeHtml;
            let statusSortValue = 4; // ソート用: 1:expired, 2:error, 3:warning, 4:valid

            switch (status.category) {
                case 'valid':
                    statusBadgeHtml = `<span class="badge bg-success">${status.text}</span>`;
                    statusSortValue = 4;
                    break;
                case 'warning':
                    row.classList.add('warning');
                    statusBadgeHtml = `<span class="badge bg-warning text-dark">${status.text}</span>`;
                    statusSortValue = 3;
                    break;
                case 'expired':
                    row.classList.add('expired');
                    statusBadgeHtml = `<span class="badge bg-danger">${status.text}</span>`;
                    statusSortValue = 1;
                    break;
                case 'error':
                default:
                    statusBadgeHtml = `<span class="badge bg-secondary">${status.text}</span>`;
                    statusSortValue = 2;
                    break;
            }

            if (status.category === 'error') {
                const errorMsg = cert ? cert.error : 'データ取得エラー';
                row.innerHTML = `
                    <td>${item.pref}</td>
                    <td>${item.city}</td>
                    <td><a href="${item.url}" target="_blank" class="text-break">${item.url}</a></td>
                    <td data-value="0000-00-00T00:00:00">${errorMsg}</td>
                    <td data-value="${statusSortValue}">${statusBadgeHtml}</td>
                `;
            } else {
                const expireDate = new Date(cert.expires_iso);
                const dateString = expireDate.toLocaleString('ja-JP');

                row.innerHTML = `
                    <td>${item.pref}</td>
                    <td>${item.city}</td>
                    <td><a href="${item.url}" target="_blank" class="text-break">${item.url}</a></td>
                    <td data-value="${cert.expires_iso}">${dateString}</td>
                    <td data-value="${statusSortValue}">${statusBadgeHtml}</td>
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
loadLastUpdated();
loadCertData();
