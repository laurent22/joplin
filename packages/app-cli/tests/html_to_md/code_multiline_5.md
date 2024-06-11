```
# SlingAcademy.com
# This code uses Python 3.11.4

import asyncio
import aiohttp

# This function downloads a file from a URL and saves it to a local file
# The function is asynchronous and can handle large files because it uses aiohttp streams
async def download_file(url, filename):
    async with aiohttp.ClientSession() as session:
        print(f"Starting download file from {url}")
        async with session.get(url) as response:
            assert response.status == 200
            with open(filename, "wb") as f:
                while True:
                    chunk = await response.content.readany()
                    if not chunk:
                        break
                    f.write(chunk)
            print(f"Downloaded {filename} from {url}")


# This function downloads two files at the same time
async def main():
    await asyncio.gather(
        # download a CSV file
        download_file(
            "https://api.slingacademy.com/v1/sample-data/files/student-scores.csv",
            "test.csv",
        ),

        # download a PDF file
        download_file(
            "https://api.slingacademy.com/v1/sample-data/files/text-and-table.pdf",
            "test.pdf",
        ),
    )

# Run the main function
asyncio.run(main())
```