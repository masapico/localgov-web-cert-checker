import csv
import json
import socket
import ssl
import urllib.parse
from datetime import datetime, timezone, timedelta
import requests
import os
import math

# テスト設定（Trueにすると最初の20件のみ実行）
IS_TEST = False

# DATA_URL = "https://raw.githubusercontent.com/code4fukui/localgovjp/refs/heads/master/deno/c-localgovjp-utf8.csv"
DATA_URL = None  # ローカルファイルを使う場合はコメントアウト
DATA_FILE = "c-localgovjp-utf8.csv"

def get_certificate_info(url):
    """URLからSSL証明書情報を取得する"""
    if not url or not url.startswith("https"):
        return {"error": "Non-HTTPS URL or empty URL"}

    parsed_url = urllib.parse.urlparse(url)
    hostname = parsed_url.hostname
    port = 443

    # 接続先ホスト名が取得できない場合のエラー回避
    if not hostname:
        return {"error": "Invalid hostname"}

    context = ssl.create_default_context()
    try:
        with socket.create_connection((hostname, port), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                
                # 有効期限のパース
                expires = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                
                return {
                    "subject": dict(x[0] for x in cert['subject']),
                    "issuer": dict(x[0] for x in cert['issuer']),
                    "notAfter": cert.get('notAfter'),
                    "expires_iso": expires.isoformat(),
                    "serialNumber": cert.get('serialNumber')
                }
    except Exception as e:
        return {"error": str(e)}

def main():
    data = []
    # 1. データの読み込み
    if DATA_URL:
        print(f"Fetching CSV data from URL: {DATA_URL}")
        # GitHubのキャッシュ対策
        headers = {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
        try:
            response = requests.get(DATA_URL)
            response.encoding = 'utf-8'
            decoded_content = response.text.splitlines()
            reader = csv.DictReader(decoded_content)
            data = list(reader)
        except Exception as e:
            print(f"Failed to fetch data from URL: {e}")
            return
    else:
        print(f"Reading CSV data from Local File: {DATA_FILE}")
        if not os.path.exists(DATA_FILE):
            print(f"Error: {DATA_FILE} not found.")
            return
        try:
            with open(DATA_FILE, encoding='utf-8') as input_file:
                reader = csv.DictReader(input_file)
                data = list(reader)
        except Exception as e:
            print(f"Failed to read local file: {e}")
            return

    # 2. 実行対象の選定
    target_data = data[:20] if IS_TEST else data
    print(f"Processing {len(target_data)} municipalities...")

    # タイムゾーンをJSTに設定
    jst = timezone(timedelta(hours=9))
    now = datetime.now(jst)

    results = []
    for i, item in enumerate(target_data):
        city_name = item.get('city', 'Unknown')
        url = item.get('url', '').strip()
        
        if i % 10 == 0 and i > 0:
            print(f"Progress: {i}/{len(target_data)}...")
        
        cert_info = get_certificate_info(url)
        
        # ステータス判定ロジック
        status_text = ''
        status_category = ''

        if cert_info.get("error"):
            status_text = "取得エラー"
            status_category = "error"
        else:
            try:
                # expires_isoはUTCのはずなので、タイムゾーン情報を付与
                expire_date_naive = datetime.fromisoformat(cert_info["expires_iso"])
                expire_date_utc = expire_date_naive.replace(tzinfo=timezone.utc)
                
                # JSTに変換して比較
                expire_date_jst = expire_date_utc.astimezone(jst)
                
                diff = expire_date_jst - now
                diff_days_float = diff.total_seconds() / (60 * 60 * 24)

                if diff_days_float < 0:
                    status_text = "期限切れ"
                    status_category = "expired"
                elif diff_days_float <= 30:
                    status_text = f"残り{math.ceil(diff_days_float)}日"
                    status_category = "warning"
                else:
                    status_text = "有効"
                    status_category = "valid"
            except (ValueError, TypeError) as e:
                print(f"Status check error for {url}: {e}")
                status_text = "日付形式エラー"
                status_category = "error"

        results.append({
            "lgcode": item.get('lgcode'),
            "pref": item.get('pref'),
            "city": city_name,
            "url": url,
            "certificate": cert_info,
            "status": {
                "text": status_text,
                "category": status_category
            }
        })

    # 3. 結果を result.json に保存
    with open('result.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    # 4. 最終更新日時を updated.txt に保存
    with open('updated.txt', 'w', encoding='utf-8') as f:
        f.write(now.strftime('%Y年%m月%d日 %H:%M:%S JST'))

    print(f"\nComplete! Processed {len(results)} items. Results saved to result.json and updated.txt")

if __name__ == "__main__":
    main()
