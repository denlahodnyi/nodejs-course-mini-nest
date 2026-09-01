# Mini Nest

Як працює (звідки беруться design:paramtypes і чому без emitDecoratorMetadata нічого не буде):

`design:paramtypes` беруться з бібліотеки reflect-metadata + увімкнені
`experimentalDecorators` та `emitDecoratorMetadata` в tsconfig. Завдяки ним в
метадані класу додаються runtime типи параметрів описаних в конструкторі або
методах класу. Завдяки цим типам ми можемо знати конкретні залежності від яких
залежить клас. Typescript типи, що не існують в runtime (такі як інтерфейси) ми
можемо описати явно за допомогою кастомних декораторів.

Як параметр-декоратор знає, куди підставити значення:

Сигнатура параметр-декоратора дозволяє отримувати порядковий індекс аргумента,
який в подальшому ми можемо зберігати в метадані, та підставляти конкретні
значення в дану позицію.

---

Команди:

Підняти локальний дев сервер (необхідно встановити `pnpm`). Порт - `8080`:

```sh
pnpm dev
```

Або через докер (порт - `3000`):

```sh
docker compose up -d
```

Приклади запитів:

```sh
curl -s -i "localhost:3000/users" # 200
curl -s -i "localhost:3000/users/1" # 200
curl -s -i "localhost:3000/users/1?attr=name" # 200
curl -s -i "localhost:3000/users" -d '{"name":"Lisa", "country":"UK"}' # 400
curl -s -i "localhost:3000/users" -d '{"name":"Lisa", "country":"UK", "age": 40, "email":"lis@example.com"}' # 201
```

---

Прогнати тести:

```sh
pnpm test
```

Викликати окремий stage в Docker який проганяє тести

```sh
docker compose run --rm test
```

Альтернативна команда:

```sh
docker compose run --rm api pnpm test
```
