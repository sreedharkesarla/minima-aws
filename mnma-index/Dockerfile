
FROM python:3.9-slim
RUN apt-get update && apt-get install -y gcc ca-certificates && update-ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

RUN pip install --upgrade pip setuptools wheel
COPY requirements.txt .
RUN pip install --default-timeout=100 --no-cache-dir --only-binary=:all: --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt
COPY . .

ENV PORT 8000
ENV CURRENT_HOST 0.0.0.0
ENV WORKERS 1

CMD ["sh", "-c", "uvicorn app:app --loop asyncio --reload --workers ${WORKERS} --host $CURRENT_HOST --port $PORT --proxy-headers"]