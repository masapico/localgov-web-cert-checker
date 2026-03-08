// 証明書の有効期限をチェックして表示する
async function loadCertData() {
    const container = document.getElementById('data-container');
    
    try {
        // result.jsonを読み込む
        const response = await fetch('result.json');
        const data = await response.json();
        
        const now = new Date();

        data.forEach(item => {
            const row = document.createElement('tr');
            
            // エラーがある場合の処理
            if (item.certificate.error) {
                row.innerHTML = `
                    <td>${item.pref}</td>
                    <td>${item.city}</td>
                    <td><a href="${item.url}" target="_blank">${item.url}</a></td>
                    <td colspan="2" class="text-danger">取得エラー: ${item.certificate.error}</td>
                `;
            } else {
                const expireDate = new Date(item.certificate.expires_iso);
                const dateString = expireDate.toLocaleString('ja-JP');
                
                // 期限チェック（例：30日前なら警告）
                const diffTime = expireDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let statusBadge = '<span class="badge bg-success">有効</span>';
                if (diffTime < 0) {
                    row.classList.add('expired');
                    statusBadge = '<span class="badge bg-danger">期限切れ</span>';
                } else if (diffDays <= 30) {
                    row.classList.add('warning');
                    statusBadge = '<span class="badge bg-warning text-dark">間もなく期限切れ</span>';
                }

                row.innerHTML = `
                    <td>${item.pref}</td>
                    <td>${item.city}</td>
                    <td><a href="${item.url}" target="_blank" class="text-break">${item.url}</a></td>
                    <td>${dateString}</td>
                    <td>${statusBadge}</td>
                `;
            }
            container.appendChild(row);
        });

    } catch (error) {
        console.error('データの読み込みに失敗しました:', error);
        container.innerHTML = '<tr><td colspan="5" class="text-center text-danger">データの読み込みに失敗しました。</td></tr>';
    }
}

// 実行
loadCertData();

let sortDirection = true; // true: 昇順, false: 降順

function sortTable(columnIndex) {
    const table = document.getElementById("cert-table");
    const tbody = document.getElementById("data-container");
    const rows = Array.from(tbody.querySelectorAll("tr"));

    // ソート実行
    const sortedRows = rows.sort((a, b) => {
        let aText = a.children[columnIndex].innerText.trim();
        let bText = b.children[columnIndex].innerText.trim();

        // 有効期限列（index: 3）の場合は日付として比較
        if (columnIndex === 3) {
            return sortDirection 
                ? new Date(aText) - new Date(bText) 
                : new Date(bText) - new Date(aText);
        }

        // 文字列として比較
        return sortDirection 
            ? aText.localeCompare(bText, 'ja') 
            : bText.localeCompare(aText, 'ja');
    });

    // 既存の行を削除して並べ替えた行を追加
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    tbody.append(...sortedRows);

    // 次回クリック用に昇順・降順を反転
    sortDirection = !sortDirection;
}