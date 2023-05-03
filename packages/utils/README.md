# Utility package

Those are generic utility functions that can be imported from any other packages. This package however shouldn't have any dependency to any other Joplin package, so that it can be imported without having to import "lib", "renderer" and so on. This is particulary important for Docker images, so that they can be trimmed down to only what's needed.