//
// MainPage.xaml.cpp
// Implementation of the MainPage class.
//

#include "pch.h"
#include "MainPage.xaml.h"
#include "sqlite3.h"

using namespace vsixtest;

using namespace Platform;
using namespace Windows::Foundation;
using namespace Windows::Foundation::Collections;
using namespace Windows::UI::Xaml;
using namespace Windows::UI::Xaml::Controls;
using namespace Windows::UI::Xaml::Controls::Primitives;
using namespace Windows::UI::Xaml::Data;
using namespace Windows::UI::Xaml::Input;
using namespace Windows::UI::Xaml::Media;
using namespace Windows::UI::Xaml::Navigation;

// The Blank Page item template is documented at http://go.microsoft.com/fwlink/?LinkId=402352&clcid=0x409

MainPage::MainPage()
{
	InitializeComponent();
	UseSQLite();
}

void MainPage::UseSQLite(void)
{
    int rc = SQLITE_OK;
    sqlite3 *pDb = nullptr;

    rc = sqlite3_open_v2("test.db", &pDb,
	SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE, nullptr);

    if (rc != SQLITE_OK)
	throw ref new FailureException("Failed to open database.");

    rc = sqlite3_exec(pDb, "VACUUM;", nullptr, nullptr, nullptr);

    if (rc != SQLITE_OK)
	throw ref new FailureException("Failed to vacuum database.");

    rc = sqlite3_close(pDb);

    if (rc != SQLITE_OK)
	throw ref new FailureException("Failed to close database.");

    pDb = nullptr;
}
