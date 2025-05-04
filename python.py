import pandas as pd
import json
from pathlib import Path

def update_watches_data():
    # Load existing JSON data
    json_path = Path('data.json')
    if json_path.exists():
        with open(json_path, 'r') as f:
            existing_data = json.load(f)
    else:
        existing_data = {
            "config": {"whatsappNumber": "9153347835"},
            "watches": [],
            "packing": [
        {
            "name": "Normal Box",
            "image": "media/packing/p1.jpg",
            "description": "A simple and elegant box included with every purchase—ideal for everyday packaging."
        },
        {
            "name": "Standard Box",
            "image": "media/packing/p2.jpg",
            "description": "A classic gift box with a refined finish...perfect for gifting or special occasions."
        },
        {
            "name": "Premium Box",
            "image": "media/packing/p3.jpg",
            "description": "A sleek and durable travel pouch...designed for protection and convenience on the go."
        },
        {
            "name": "Original Box",
            "image": "media/packing/p4.jpg",
            "description": "The brands signature packaging...stylish, protective, and designed to make a lasting impression."
        }
    ],
    "faq": []
        }

    # Read Excel file
    try:
        df = pd.read_excel('watches_data.xlsx', dtype={'Code': str})
        
        # Validate required columns
        required_columns = [
            'Code', 'Brand', 'Title', 'Price',
            'Discounted Price', 'Gender', 'Colour', 'Photo & Videos'
        ]
        
        missing_cols = [col for col in required_columns if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Missing columns in Excel file: {', '.join(missing_cols)}")

    except Exception as e:
        print(f"Error reading Excel file: {str(e)}")
        return

    # Process watches data
    new_watches = []
    for _, row in df.iterrows():
        try:
            code = row['Code']
            media = []
            
            # Process media files
            pics, videos = map(int, str(row['Photo & Videos']).split(','))
            for i in range(pics):
                suffix = f"{i}" if i > 0 else ""
                media.append({
                    "type": "image",
                    "url": f"media/watches_image/{code}{suffix}.jpg"
                })
            
            if videos > 0:
                media.append({
                    "type": "video",
                    "url": f"media/watches_video/{code}.mp4"
                })

            # Create watch entry
            watch = {
                "id": code,
                "brand": row['Brand'],
                "title": row['Title'],
                "price": int(row['Price']),
                "discountedPrice": int(row['Discounted Price']),
                "colors": [c.strip() for c in str(row['Colour']).split(',')],
                "gender": row['Gender'],
                "offers": [o.strip() for o in str(row.get('Offers', '')).split(',') if o.strip()],
                "media": media
            }
            new_watches.append(watch)
            
        except Exception as e:
            print(f"Skipping row {_+2} due to error: {str(e)}")
            continue

    # Update only watches data while preserving other sections
    updated_data = {
        **existing_data,
        "watches": new_watches
    }

    # Save updated JSON
    with open(json_path, 'w') as f:
        json.dump(updated_data, f, indent=2)

    print(f"Data updated successfully! Processed {len(new_watches)} watches.")

if __name__ == "__main__":
    update_watches_data()