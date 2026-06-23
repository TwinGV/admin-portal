# Admin Portal 🚀

Веб-страница для админа с красивыми кнопками-ссылками на корпоративные сервисы.

## Фичи

✅ Аутентификация через Active Directory (прозрачная)  
✅ Кнопки-ссылки на сервисы (общие + личные)  
✅ CRUD операции (добавить, удалить, редактировать)  
✅ Защита от случайного удаления (капча)  
✅ Иконки (Font Awesome + upload с компа)  
✅ Темы (тёмная/светлая)  
✅ Языки (RU/EN)  
✅ Контроль доступа (группа AD: "LS Docs ВТС Компьютерная служба")

## Стек

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Auth**: LDAP (Active Directory)
- **DB**: JSON файл
- **Icons**: Font Awesome
- **Themes**: CSS + Context API
- **i18n**: i18next

## Структура проекта

```
admin-portal/
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   ├── auth/
│   │   │   ├── ldap.ts
│   │   │   └── middleware.ts
│   │   ├── routes/
│   │   │   ├── buttons.ts
│   │   │   └── auth.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── data.json
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ButtonCard.tsx
│   │   │   ├── AddButtonModal.tsx
│   │   │   ├── ConfirmDelete.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── pages/
│   │   │   └── Dashboard.tsx
│   │   ├── context/
│   │   │   ├── ThemeContext.tsx
│   │   │   ├── LanguageContext.tsx
│   │   │   └── AuthContext.tsx
│   │   ├── i18n/
│   │   │   ├── ru.json
│   │   │   └── en.json
│   │   ├── theme/
│   │   │   ├── dark.css
│   │   │   └── light.css
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── public/
│   │   └── uploads/
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── .gitignore
└── docker-compose.yml (опционально)
```

## Установка и запуск

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Фронт: http://localhost:5173  
Бэк: http://localhost:3001

## API Endpoints

```
POST   /api/auth/login         - Вход (LDAP)
POST   /api/auth/logout        - Выход
GET    /api/auth/user          - Текущий пользователь
GET    /api/buttons            - Список кнопок (общие + личные)
POST   /api/buttons            - Добавить кнопку
PUT    /api/buttons/:id        - Редактировать кнопку
DELETE /api/buttons/:id        - Удалить кнопку
POST   /api/buttons/:id/upload - Upload иконки
```

## Конфигурация

Создай `.env` в `backend/`:

```env
PORT=3001
LDAP_URL=ldap://dc.example.com
LDAP_BASE_DN=dc=example,dc=com
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_BIND_PASSWORD=password
LDAP_GROUP=LS Docs ВТС Компьютерная служба
SESSION_SECRET=your-secret-key
```

## Лицензия

MIT
